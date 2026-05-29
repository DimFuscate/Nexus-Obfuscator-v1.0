import type { LuaToken, ProgramNode } from "./astTypes.js";

export interface SymbolRecord {
  name: string;
  token?: LuaToken;
  kind: "local" | "global" | "upvalue" | "parameter";
}

export interface Scope {
  id: number;
  parent?: Scope;
  locals: Map<string, SymbolRecord>;
  globals: Map<string, SymbolRecord>;
  upvalues: Map<string, SymbolRecord>;
  children: Scope[];
}

export interface ScopeInfo {
  root: Scope;
  scopes: Scope[];
  locals: SymbolRecord[];
  globals: SymbolRecord[];
  upvalues: SymbolRecord[];
  functionScopes: Scope[];
}

export interface ScopeAnalyzeOptions {
  dialect: string;
  target: string;
}

let scopeId = 0;

export function createScope(parent?: Scope): Scope {
  const scope: Scope = {
    id: scopeId++,
    parent,
    locals: new Map(),
    globals: new Map(),
    upvalues: new Map(),
    children: [],
  };
  parent?.children.push(scope);
  return scope;
}

export function registerLocal(scope: Scope, name: string, token?: LuaToken): SymbolRecord {
  const record: SymbolRecord = { name, token, kind: "local" };
  scope.locals.set(name, record);
  return record;
}

export function registerGlobal(scope: Scope, name: string, token?: LuaToken): SymbolRecord {
  const record: SymbolRecord = { name, token, kind: "global" };
  scope.globals.set(name, record);
  return record;
}

export function registerUpvalue(scope: Scope, name: string, token?: LuaToken): SymbolRecord {
  const record: SymbolRecord = { name, token, kind: "upvalue" };
  scope.upvalues.set(name, record);
  return record;
}

export function resolveIdentifier(scope: Scope, name: string): SymbolRecord | undefined {
  let cursor: Scope | undefined = scope;
  while (cursor) {
    const local = cursor.locals.get(name);
    if (local) {
      return local;
    }
    cursor = cursor.parent;
  }
  return scope.globals.get(name);
}

export function isLocal(scope: Scope, name: string): boolean {
  return scope.locals.has(name);
}

export function isGlobal(scope: Scope, name: string): boolean {
  return scope.globals.has(name);
}

export function isUpvalue(scope: Scope, name: string): boolean {
  return scope.upvalues.has(name);
}

export function analyzeScopes(ast: ProgramNode, _options: ScopeAnalyzeOptions): ScopeInfo {
  scopeId = 0;
  const root = createScope();
  const scopes = [root];
  const tokens = significantTokens(ast.tokens);
  const locals: SymbolRecord[] = [];
  const globals: SymbolRecord[] = [];
  const functionScopes: Scope[] = [];

  const localNames = new Set<string>();

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "keyword" && token.value === "local") {
      if (tokens[i + 1]?.value === "function" && tokens[i + 2]?.type === "identifier") {
        const record = registerLocal(root, tokens[i + 2].value, tokens[i + 2]);
        locals.push(record);
        localNames.add(record.name);
        continue;
      }
      let cursor = i + 1;
      while (cursor < tokens.length) {
        const current = tokens[cursor];
        if (current.value === "=" || current.value === "in" || current.value === "do" || current.value === ";") {
          break;
        }
        if (current.type === "identifier") {
          const record = registerLocal(root, current.value, current);
          locals.push(record);
          localNames.add(record.name);
        }
        cursor += 1;
      }
    }

    if (token.type === "keyword" && token.value === "function") {
      const fnScope = createScope(root);
      scopes.push(fnScope);
      functionScopes.push(fnScope);
      collectFunctionParams(tokens, i, fnScope, locals);
    }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type !== "identifier") {
      continue;
    }
    if (isPropertyOrMethodName(tokens, i) || localNames.has(token.value)) {
      continue;
    }
    if (!root.globals.has(token.value)) {
      const record = registerGlobal(root, token.value, token);
      globals.push(record);
    }
  }

  return {
    root,
    scopes,
    locals,
    globals,
    upvalues: [],
    functionScopes,
  };
}

export function collectFunctionScopes(ast: ProgramNode): Scope[] {
  return analyzeScopes(ast, { dialect: ast.dialect, target: "generic" }).functionScopes;
}

export function collectDeclaredLocals(ast: ProgramNode): SymbolRecord[] {
  return analyzeScopes(ast, { dialect: ast.dialect, target: "generic" }).locals;
}

export function collectAssignedGlobals(ast: ProgramNode): SymbolRecord[] {
  const info = analyzeScopes(ast, { dialect: ast.dialect, target: "generic" });
  return info.globals.filter((record) => {
    const token = record.token;
    return Boolean(token && nextSignificant(ast.tokens, token.id)?.value === "=");
  });
}

export function collectReadGlobals(ast: ProgramNode): SymbolRecord[] {
  const assigned = new Set(collectAssignedGlobals(ast).map((record) => record.name));
  return analyzeScopes(ast, { dialect: ast.dialect, target: "generic" }).globals.filter((record) => !assigned.has(record.name));
}

function collectFunctionParams(tokens: LuaToken[], functionIndex: number, scope: Scope, locals: SymbolRecord[]): void {
  const open = tokens.findIndex((token, index) => index > functionIndex && token.value === "(");
  if (open === -1) {
    return;
  }
  for (let i = open + 1; i < tokens.length && tokens[i].value !== ")"; i += 1) {
    if (tokens[i].type === "identifier") {
      const record: SymbolRecord = { name: tokens[i].value, token: tokens[i], kind: "parameter" };
      scope.locals.set(record.name, record);
      locals.push(record);
    }
  }
}

function significantTokens(tokens: LuaToken[]): LuaToken[] {
  return tokens.filter((token) => token.type !== "whitespace" && token.type !== "comment" && token.type !== "eof");
}

function isPropertyOrMethodName(tokens: LuaToken[], index: number): boolean {
  const previous = previousSignificant(tokens, tokens[index].id);
  return previous?.value === "." || previous?.value === ":";
}

function previousSignificant(tokens: LuaToken[], tokenId: number): LuaToken | undefined {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    if (token.id >= tokenId) {
      continue;
    }
    if (token.type !== "whitespace" && token.type !== "comment") {
      return token;
    }
  }
  return undefined;
}

function nextSignificant(tokens: LuaToken[], tokenId: number): LuaToken | undefined {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.id <= tokenId) {
      continue;
    }
    if (token.type !== "whitespace" && token.type !== "comment") {
      return token;
    }
  }
  return undefined;
}
