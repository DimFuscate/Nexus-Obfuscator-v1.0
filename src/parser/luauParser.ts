import type { LuaDialect } from "../pipeline/config.js";
import {
  LUA_KEYWORDS,
  type AstNode,
  type CallStatementNode,
  type ExpressionNode,
  type LuaToken,
  type LuaTokenType,
  type ParseOptions,
  type ProgramNode,
  type StatementNode,
} from "./astTypes.js";

export function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function parseLuaSource(source: string, options: ParseOptions = {}): ProgramNode {
  return buildAST(source, options.dialect ?? "lua51");
}

export function parseLuauSource(source: string, options: ParseOptions = {}): ProgramNode {
  return buildAST(source, options.dialect ?? "luau");
}

export function parseSource(source: string, dialect: LuaDialect): ProgramNode {
  return buildAST(source, dialect);
}

export function buildAST(source: string, dialect: LuaDialect): ProgramNode {
  const normalized = normalizeLineEndings(source);
  const tokens = tokenizeLua(normalized);
  const body = parseTopLevelStatements(tokens);
  const program: ProgramNode = {
    kind: "Program",
    dialect,
    source: normalized,
    tokens,
    body,
    children: body,
    metadata: {},
  };
  attachParents(program, body);
  return program;
}

function parseTopLevelStatements(tokens: LuaToken[]): StatementNode[] {
  const significant = tokens.filter((token) => token.type !== "whitespace" && token.type !== "comment" && token.type !== "eof");
  const statements: StatementNode[] = [];
  let index = 0;

  while (index < significant.length) {
    const start = index;
    const token = significant[index];
    if (token.value === ";") {
      index += 1;
      continue;
    }
    const end = findStatementEnd(significant, index);
    const slice = significant.slice(start, end);
    const statement = parseStatementSlice(slice);
    if (statement) {
      statements.push(statement);
    }
    index = Math.max(end, index + 1);
  }

  return statements;
}

function parseStatementSlice(tokens: LuaToken[]): StatementNode | undefined {
  if (tokens.length === 0) {
    return undefined;
  }
  const first = tokens[0];
  const range = {
    startToken: first.id,
    endToken: tokens[tokens.length - 1].id,
    startIndex: first.start.index,
    endIndex: tokens[tokens.length - 1].end.index,
  };

  if (first.value === "local" && tokens[1]?.value === "function") {
    const name = tokens.find((token, index) => index > 1 && token.type === "identifier")?.value;
    return {
      kind: "FunctionDeclaration",
      local: true,
      method: false,
      name,
      params: collectParams(tokens),
      body: [],
      children: [],
      range,
    };
  }

  if (first.value === "function") {
    const nameParts: string[] = [];
    let method = false;
    for (let i = 1; i < tokens.length && tokens[i].value !== "("; i += 1) {
      if (tokens[i].value === ":") {
        method = true;
      }
      if (tokens[i].type === "identifier") {
        nameParts.push(tokens[i].value);
      }
    }
    return {
      kind: "FunctionDeclaration",
      local: false,
      method,
      name: nameParts.join(method ? ":" : "."),
      params: collectParams(tokens),
      body: [],
      children: [],
      range,
    };
  }

  if (first.value === "local") {
    const names: string[] = [];
    const equals = tokens.findIndex((token) => token.value === "=");
    const nameEnd = equals === -1 ? tokens.length : equals;
    for (let i = 1; i < tokens.length; i += 1) {
      if (i >= nameEnd) {
        break;
      }
      if (tokens[i].value === "=" || tokens[i].value === "in" || tokens[i].value === "do") {
        break;
      }
      if (tokens[i].type === "identifier") {
        names.push(tokens[i].value);
      }
    }
    return { kind: "LocalDeclaration", names, values: equals === -1 ? [] : parseExpressionList(tokens.slice(equals + 1)), children: [], range };
  }

  if (first.value === "return") {
    return {
      kind: "ReturnStatement",
      values: parseExpressionList(tokens.slice(1)),
      children: [],
      range,
    };
  }

  if (first.value === "if") {
    const thenIndex = tokens.findIndex((token) => token.value === "then");
    const elseIndex = findTopLevelKeyword(tokens, "else", thenIndex + 1);
    const endIndex = findLastKeyword(tokens, "end");
    if (thenIndex > 0 && endIndex > thenIndex) {
      const condition = parseExpression(tokens.slice(1, thenIndex)) ?? unknownExpression(tokens.slice(1, thenIndex));
      const thenTokens = tokens.slice(thenIndex + 1, elseIndex === -1 ? endIndex : elseIndex);
      const elseTokens = elseIndex === -1 ? [] : tokens.slice(elseIndex + 1, endIndex);
      return {
        kind: "IfStatement",
        condition,
        thenBody: parseTopLevelStatements(withEof(thenTokens)),
        elseBody: parseTopLevelStatements(withEof(elseTokens)),
        children: [],
        range,
      };
    }
  }

  if (first.value === "while") {
    const doIndex = tokens.findIndex((token) => token.value === "do");
    const endIndex = findLastKeyword(tokens, "end");
    if (doIndex > 0 && endIndex > doIndex) {
      return {
        kind: "WhileStatement",
        condition: parseExpression(tokens.slice(1, doIndex)) ?? unknownExpression(tokens.slice(1, doIndex)),
        body: parseTopLevelStatements(withEof(tokens.slice(doIndex + 1, endIndex))),
        children: [],
        range,
      };
    }
  }

  if (["if", "while", "repeat", "for", "do"].includes(first.value)) {
    return {
      kind: "ControlStatement",
      control: first.value as "if" | "while" | "repeat" | "for" | "do",
      children: [],
      range,
    };
  }

  const call = parseCallStatement(tokens, range);
  if (call) {
    return call;
  }

  const assignment = tokens.findIndex((token) => token.value === "=" || token.value.endsWith("="));
  if (assignment > 0) {
    return {
      kind: "AssignmentStatement",
      targets: tokens.slice(0, assignment).filter((token) => token.type === "identifier").map((token) => token.value),
      values: parseExpressionList(tokens.slice(assignment + 1)),
      children: [],
      range,
    };
  }

  return { kind: "UnknownStatement", reason: `Unsupported statement near '${first.value}'`, children: [], range };
}

function parseCallStatement(tokens: LuaToken[], range: NonNullable<AstNode["range"]>): CallStatementNode | undefined {
  const open = tokens.findIndex((token) => token.value === "(");
  if (open <= 0) {
    return undefined;
  }
  const close = findMatchingInSlice(tokens, open, "(", ")");
  if (close === -1) {
    return undefined;
  }
  const calleeTokens = tokens.slice(0, open);
  const identifiers = calleeTokens.filter((token) => token.type === "identifier").map((token) => token.value);
  if (identifiers.length === 0) {
    return undefined;
  }
  const colon = calleeTokens.findIndex((token) => token.value === ":");
  return {
    kind: "CallStatement",
    callee: identifiers.slice(0, colon === -1 ? identifiers.length : -1).join("."),
    method: colon === -1 ? undefined : identifiers[identifiers.length - 1],
    arguments: parseExpressionList(tokens.slice(open + 1, close)),
    children: [],
    range,
  };
}

function parseExpressionList(tokens: LuaToken[]): ExpressionNode[] {
  const expressions: ExpressionNode[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i <= tokens.length; i += 1) {
    const token = tokens[i];
    if (token?.value === "(" || token?.value === "{" || token?.value === "[") {
      depth += 1;
    } else if (token?.value === ")" || token?.value === "}" || token?.value === "]") {
      depth -= 1;
    }
    if (i === tokens.length || (depth === 0 && token?.value === ",")) {
      const slice = tokens.slice(start, i);
      const expression = parseExpression(slice);
      if (expression) {
        expressions.push(expression);
      }
      start = i + 1;
    }
  }
  return expressions;
}

function parseExpression(tokens: LuaToken[]): ExpressionNode | undefined {
  const clean = tokens.filter((token) => token.value !== ",");
  if (clean.length === 0) {
    return undefined;
  }
  const binaryIndex = findBinaryOperator(clean);
  if (binaryIndex !== -1) {
    const left = parseExpression(clean.slice(0, binaryIndex));
    const right = parseExpression(clean.slice(binaryIndex + 1));
    if (left && right) {
      return {
        kind: "BinaryExpression",
        operator: clean[binaryIndex].value as "+" | "-" | "*" | "/" | "%" | "^" | ".." | "==" | "~=" | "<" | "<=" | ">" | ">=",
        left,
        right,
      };
    }
  }
  if (clean[0]?.value === "{" && clean[clean.length - 1]?.value === "}") {
    return parseTableConstructor(clean.slice(1, -1));
  }
  const call = parseCallExpression(clean);
  if (call) {
    return call;
  }
  const member = parseMemberExpression(clean);
  if (member) {
    return member;
  }
  if (clean.length === 1) {
    const token = clean[0];
    if (token.type === "string") {
      return { kind: "StringLiteral", raw: token.value, value: decodeLuaStringToken(token.value) };
    }
    if (token.type === "number") {
      return { kind: "NumericLiteral", raw: token.value, value: Number(token.value.replace(/_/g, "")) };
    }
    if (token.value === "true" || token.value === "false") {
      return { kind: "BooleanLiteral", raw: token.value, value: token.value === "true" };
    }
    if (token.value === "nil") {
      return { kind: "NilLiteral", raw: token.value, value: null };
    }
    if (token.value === "...") {
      return { kind: "VarargExpression" };
    }
    if (token.type === "identifier") {
      return { kind: "IdentifierExpression", name: token.value };
    }
  }
  return unknownExpression(clean);
}

function parseTableConstructor(tokens: LuaToken[]): ExpressionNode {
  const fields = splitTopLevel(tokens, ";").flatMap((part) => splitTopLevel(part, ",")).filter((part) => part.length > 0).map((fieldTokens) => {
    const equals = fieldTokens.findIndex((token) => token.value === "=");
    if (equals > 0 && fieldTokens[0].type === "identifier") {
      return { key: fieldTokens[0].value, value: parseExpression(fieldTokens.slice(equals + 1)) ?? unknownExpression(fieldTokens.slice(equals + 1)) };
    }
    return { value: parseExpression(fieldTokens) ?? unknownExpression(fieldTokens) };
  });
  return { kind: "TableConstructorExpression", fields };
}

function parseCallExpression(tokens: LuaToken[]): ExpressionNode | undefined {
  const open = tokens.findIndex((token) => token.value === "(");
  if (open <= 0 || findMatchingInSlice(tokens, open, "(", ")") !== tokens.length - 1) {
    return undefined;
  }
  const calleeTokens = tokens.slice(0, open);
  const colon = calleeTokens.findIndex((token) => token.value === ":");
  if (colon !== -1) {
    const object = parseExpression(calleeTokens.slice(0, colon));
    const method = calleeTokens[colon + 1]?.value;
    if (object && method) {
      return {
        kind: "CallExpression",
        callee: object,
        method,
        arguments: parseExpressionList(tokens.slice(open + 1, -1)),
      };
    }
  }
  const callee = parseExpression(calleeTokens);
  if (!callee) {
    return undefined;
  }
  return { kind: "CallExpression", callee, arguments: parseExpressionList(tokens.slice(open + 1, -1)) };
}

function parseMemberExpression(tokens: LuaToken[]): ExpressionNode | undefined {
  if (tokens.length < 3) {
    return undefined;
  }
  const dot = tokens.findIndex((token) => token.value === ".");
  if (dot <= 0 || tokens[dot + 1]?.type !== "identifier") {
    return undefined;
  }
  const object = parseExpression(tokens.slice(0, dot));
  if (!object) {
    return undefined;
  }
  let expression: ExpressionNode = { kind: "MemberExpression", object, property: tokens[dot + 1].value };
  let cursor = dot + 2;
  while (tokens[cursor]?.value === "." && tokens[cursor + 1]?.type === "identifier") {
    expression = { kind: "MemberExpression", object: expression, property: tokens[cursor + 1].value };
    cursor += 2;
  }
  return cursor === tokens.length ? expression : undefined;
}

function findBinaryOperator(tokens: LuaToken[]): number {
  const precedenceGroups = [["==", "~=", "<", "<=", ">", ">="], [".."], ["+", "-"], ["*", "/", "%"], ["^"]];
  for (const group of precedenceGroups) {
    let depth = 0;
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      if (tokens[i].value === ")" || tokens[i].value === "}" || tokens[i].value === "]") depth += 1;
      if (tokens[i].value === "(" || tokens[i].value === "{" || tokens[i].value === "[") depth -= 1;
      if (depth === 0 && group.includes(tokens[i].value)) {
        return i;
      }
    }
  }
  return -1;
}

function splitTopLevel(tokens: LuaToken[], separator: string): LuaToken[][] {
  const parts: LuaToken[][] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= tokens.length; i += 1) {
    const token = tokens[i];
    if (token?.value === "(" || token?.value === "{" || token?.value === "[") depth += 1;
    if (token?.value === ")" || token?.value === "}" || token?.value === "]") depth -= 1;
    if (i === tokens.length || (depth === 0 && token?.value === separator)) {
      parts.push(tokens.slice(start, i));
      start = i + 1;
    }
  }
  return parts;
}

function unknownExpression(tokens: LuaToken[]): ExpressionNode {
  return { kind: "UnknownExpression", raw: tokens.map((token) => token.value).join("") };
}

function collectParams(tokens: LuaToken[]): string[] {
  const open = tokens.findIndex((token) => token.value === "(");
  if (open === -1) {
    return [];
  }
  const close = findMatchingInSlice(tokens, open, "(", ")");
  return tokens.slice(open + 1, close === -1 ? tokens.length : close)
    .filter((token) => token.type === "identifier" || token.value === "...")
    .map((token) => token.value);
}

function findStatementEnd(tokens: LuaToken[], start: number): number {
  let depth = 0;
  for (let i = start; i < tokens.length; i += 1) {
    const value = tokens[i].value;
    if (value === "(" || value === "{" || value === "[") {
      depth += 1;
    } else if (value === ")" || value === "}" || value === "]") {
      depth -= 1;
    }
    if (depth === 0 && (value === ";" || value === "end" || value === "until")) {
      return i + 1;
    }
    if (depth === 0 && i > start && tokens[i].start.line > tokens[i - 1].end.line && canEndBefore(tokens[i - 1])) {
      return i;
    }
    if (depth === 0 && i > start && startsNewStatement(tokens[i])) {
      return i;
    }
  }
  return tokens.length;
}

function canEndBefore(token: LuaToken): boolean {
  return !["=", "+", "-", "*", "/", "%", "^", "..", ",", ".", ":", "and", "or", "not"].includes(token.value);
}

function startsNewStatement(token: LuaToken): boolean {
  return ["local", "function", "if", "while", "repeat", "for", "do", "return"].includes(token.value);
}

function findMatchingInSlice(tokens: LuaToken[], open: number, left: string, right: string): number {
  let depth = 0;
  for (let i = open; i < tokens.length; i += 1) {
    if (tokens[i].value === left) {
      depth += 1;
    } else if (tokens[i].value === right) {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findTopLevelKeyword(tokens: LuaToken[], keyword: string, start: number): number {
  let depth = 0;
  for (let i = Math.max(0, start); i < tokens.length; i += 1) {
    if (tokens[i].value === "if" || tokens[i].value === "while" || tokens[i].value === "for" || tokens[i].value === "function") depth += 1;
    if (tokens[i].value === "end") depth -= 1;
    if (depth === 0 && tokens[i].value === keyword) return i;
  }
  return -1;
}

function findLastKeyword(tokens: LuaToken[], keyword: string): number {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i].value === keyword) return i;
  }
  return -1;
}

function withEof(tokens: LuaToken[]): LuaToken[] {
  const last = tokens[tokens.length - 1];
  const loc = last?.end ?? { index: 0, line: 1, column: 1 };
  return [...tokens, { id: -1, type: "eof", value: "", start: loc, end: loc }];
}

function attachParents(parent: AstNode, children: AstNode[]): void {
  for (const child of children) {
    child.parent = parent;
    attachParents(child, child.children ?? []);
  }
}

function decodeLuaStringToken(raw: string): string {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw.replace(/^\[=*\[/, "").replace(/\]=*\]$/, "");
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw.slice(1, -1);
  }
}

export function validateParserCoverage(ast: ProgramNode): string[] {
  const warnings: string[] = [];
  for (const statement of ast.body) {
    if (statement.kind === "UnknownStatement") {
      warnings.push(statement.reason);
    }
  }
  return warnings;
}

export function getStatementSource(ast: ProgramNode, node: AstNode): string {
  if (!node.range) {
    return "";
  }
  return ast.source.slice(node.range.startIndex, node.range.endIndex);
}

/* tokenization */
function legacyBuildAST(source: string, dialect: LuaDialect): ProgramNode {
  const normalized = normalizeLineEndings(source);
  return {
    kind: "Program",
    dialect,
    source: normalized,
    tokens: tokenizeLua(normalized),
    body: [],
    children: [],
    metadata: {},
  };
}

export function tokenizeLua(source: string): LuaToken[] {
  const tokens: LuaToken[] = [];
  let index = 0;
  let line = 1;
  let column = 1;
  let id = 0;

  function loc() {
    return { index, line, column };
  }

  function advance(value: string): void {
    for (let i = 0; i < value.length; i += 1) {
      index += 1;
      if (value.charAt(i) === "\n") {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
    }
  }

  function emit(type: LuaTokenType, value: string, start: ReturnType<typeof loc>): void {
    advance(value);
    tokens.push({ id: id++, type, value, start, end: loc() });
  }

  while (index < source.length) {
    const start = loc();
    const ch = source.charAt(index);
    const next = source.charAt(index + 1);

    if (isWhitespace(ch)) {
      let end = index + 1;
      while (end < source.length && isWhitespace(source.charAt(end))) {
        end += 1;
      }
      emit("whitespace", source.slice(index, end), start);
      continue;
    }

    if (ch === "-" && next === "-") {
      const long = readLongBracket(source, index + 2);
      if (long) {
        emit("comment", source.slice(index, long.end), start);
      } else {
        let end = index + 2;
        while (end < source.length && source.charAt(end) !== "\n") {
          end += 1;
        }
        emit("comment", source.slice(index, end), start);
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      emit("string", source.slice(index, readQuotedString(source, index)), start);
      continue;
    }

    const longString = readLongBracket(source, index);
    if (longString) {
      emit("string", source.slice(index, longString.end), start);
      continue;
    }

    if (isIdentifierStart(ch)) {
      let end = index + 1;
      while (end < source.length && isIdentifierPart(source.charAt(end))) {
        end += 1;
      }
      const value = source.slice(index, end);
      emit(LUA_KEYWORDS.has(value) ? "keyword" : "identifier", value, start);
      continue;
    }

    if (isNumberStart(source, index)) {
      emit("number", source.slice(index, readNumber(source, index)), start);
      continue;
    }

    const three = source.slice(index, index + 3);
    const two = source.slice(index, index + 2);
    if (three === "...") {
      emit("symbol", three, start);
      continue;
    }
    if (["==", "~=", "<=", ">=", "::", "//", "..", "+=", "-=", "*=", "/=", "%=", "^="].includes(two)) {
      emit("symbol", two, start);
      continue;
    }

    emit("symbol", ch, start);
  }

  tokens.push({ id: id++, type: "eof", value: "", start: loc(), end: loc() });
  return tokens;
}

function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\v" || ch === "\f";
}

function isIdentifierStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentifierPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function isNumberStart(source: string, index: number): boolean {
  const ch = source.charAt(index);
  if (/[0-9]/.test(ch)) {
    return true;
  }
  return ch === "." && /[0-9]/.test(source.charAt(index + 1)) && source.charAt(index + 1) !== ".";
}

function readNumber(source: string, index: number): number {
  let end = index;
  if (source.slice(end, end + 2).toLowerCase() === "0x") {
    end += 2;
    while (/[0-9a-fA-F_.pP+-]/.test(source.charAt(end))) {
      end += 1;
    }
    return end;
  }
  while (/[0-9_]/.test(source.charAt(end))) {
    end += 1;
  }
  if (source.charAt(end) === "." && source.charAt(end + 1) !== ".") {
    end += 1;
    while (/[0-9_]/.test(source.charAt(end))) {
      end += 1;
    }
  }
  if (/[eE]/.test(source.charAt(end))) {
    end += 1;
    if (/[+-]/.test(source.charAt(end))) {
      end += 1;
    }
    while (/[0-9_]/.test(source.charAt(end))) {
      end += 1;
    }
  }
  return end;
}

function readQuotedString(source: string, index: number): number {
  const quote = source.charAt(index);
  let end = index + 1;
  while (end < source.length) {
    const ch = source.charAt(end);
    if (ch === "\\") {
      end += 2;
      continue;
    }
    end += 1;
    if (ch === quote) {
      break;
    }
  }
  return end;
}

function readLongBracket(source: string, index: number): { end: number } | null {
  if (source.charAt(index) !== "[") {
    return null;
  }
  let cursor = index + 1;
  while (source.charAt(cursor) === "=") {
    cursor += 1;
  }
  if (source.charAt(cursor) !== "[") {
    return null;
  }
  const equals = cursor - index - 1;
  const close = `]${"=".repeat(equals)}]`;
  const closeIndex = source.indexOf(close, cursor + 1);
  return { end: closeIndex === -1 ? source.length : closeIndex + close.length };
}
