import type { LuaDialect } from "../pipeline/config.js";

export type LuaTokenType =
  | "whitespace"
  | "comment"
  | "identifier"
  | "keyword"
  | "number"
  | "string"
  | "symbol"
  | "eof";

export interface SourceLocation {
  index: number;
  line: number;
  column: number;
}

export interface LuaToken {
  id: number;
  type: LuaTokenType;
  value: string;
  start: SourceLocation;
  end: SourceLocation;
}

export interface AstNode {
  kind: string;
  parent?: AstNode;
  children?: AstNode[];
  metadata?: Record<string, unknown>;
  range?: SourceRange;
}

export interface ProgramNode extends AstNode {
  kind: "Program";
  dialect: LuaDialect;
  source: string;
  tokens: LuaToken[];
  body: StatementNode[];
}

export interface SourceRange {
  startToken: number;
  endToken: number;
  startIndex: number;
  endIndex: number;
}

export type StatementNode =
  | FunctionDeclarationNode
  | LocalDeclarationNode
  | AssignmentStatementNode
  | CallStatementNode
  | ReturnStatementNode
  | IfStatementNode
  | WhileStatementNode
  | ControlStatementNode
  | UnknownStatementNode;

export interface FunctionDeclarationNode extends AstNode {
  kind: "FunctionDeclaration";
  name?: string;
  local: boolean;
  method: boolean;
  params: string[];
  body: StatementNode[];
}

export interface LocalDeclarationNode extends AstNode {
  kind: "LocalDeclaration";
  names: string[];
  values: ExpressionNode[];
}

export interface AssignmentStatementNode extends AstNode {
  kind: "AssignmentStatement";
  targets: string[];
  values: ExpressionNode[];
}

export interface CallStatementNode extends AstNode {
  kind: "CallStatement";
  callee: string;
  method?: string;
  arguments: ExpressionNode[];
}

export interface ReturnStatementNode extends AstNode {
  kind: "ReturnStatement";
  values: ExpressionNode[];
}

export interface IfStatementNode extends AstNode {
  kind: "IfStatement";
  condition: ExpressionNode;
  thenBody: StatementNode[];
  elseBody: StatementNode[];
}

export interface WhileStatementNode extends AstNode {
  kind: "WhileStatement";
  condition: ExpressionNode;
  body: StatementNode[];
}

export interface ControlStatementNode extends AstNode {
  kind: "ControlStatement";
  control: "if" | "while" | "repeat" | "for" | "do";
}

export interface UnknownStatementNode extends AstNode {
  kind: "UnknownStatement";
  reason: string;
}

export type ExpressionNode =
  | IdentifierExpressionNode
  | LiteralExpressionNode
  | BinaryExpressionNode
  | MemberExpressionNode
  | TableConstructorExpressionNode
  | CallExpressionNode
  | VarargExpressionNode
  | UnknownExpressionNode;

export interface IdentifierExpressionNode extends AstNode {
  kind: "IdentifierExpression";
  name: string;
}

export interface LiteralExpressionNode extends AstNode {
  kind: "StringLiteral" | "NumericLiteral" | "BooleanLiteral" | "NilLiteral";
  raw: string;
  value: string | number | boolean | null;
}

export interface BinaryExpressionNode extends AstNode {
  kind: "BinaryExpression";
  operator: "+" | "-" | "*" | "/" | "%" | "^" | ".." | "==" | "~=" | "<" | "<=" | ">" | ">=";
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface MemberExpressionNode extends AstNode {
  kind: "MemberExpression";
  object: ExpressionNode;
  property: string;
}

export interface TableFieldNode {
  key?: string | ExpressionNode;
  value: ExpressionNode;
}

export interface TableConstructorExpressionNode extends AstNode {
  kind: "TableConstructorExpression";
  fields: TableFieldNode[];
}

export interface CallExpressionNode extends AstNode {
  kind: "CallExpression";
  callee: ExpressionNode;
  method?: string;
  arguments: ExpressionNode[];
}

export interface VarargExpressionNode extends AstNode {
  kind: "VarargExpression";
}

export interface UnknownExpressionNode extends AstNode {
  kind: "UnknownExpression";
  raw: string;
}

export interface IdentifierNode extends AstNode {
  kind: "Identifier";
  name: string;
  token: LuaToken;
}

export interface LiteralNode extends AstNode {
  kind: "StringLiteral" | "NumericLiteral" | "BooleanLiteral" | "NilLiteral";
  raw: string;
  value: string | number | boolean | null;
  token: LuaToken;
}

export interface ParseOptions {
  dialect?: LuaDialect;
}

export const LUA_KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
  "continue",
  "export",
  "type",
]);
