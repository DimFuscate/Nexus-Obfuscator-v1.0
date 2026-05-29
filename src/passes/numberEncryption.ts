import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode, LuaToken } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export function encryptNumbers(ast: ProgramNode, _scopeInfo: ScopeInfo, _options: ObfuscationOptions): LuaToken[] {
  const numbers = collectNumericConstants(ast);
  ast.metadata ??= {};
  ast.metadata.numericConstantCount = numbers.length;
  return numbers;
}

export function hideConstants(ast: ProgramNode, options: ObfuscationOptions): LuaToken[] {
  return encryptNumbers(ast, { root: undefined as never, scopes: [], locals: [], globals: [], upvalues: [], functionScopes: [] }, options);
}

export function collectNumericConstants(ast: ProgramNode): LuaToken[] {
  return ast.tokens.filter((token) => token.type === "number");
}

export function encodeNumberConstant(value: number, strategy = "arithmetic"): string {
  if (strategy === "string") {
    return encodeNumberAsStringCharTonumber(value);
  }
  if (strategy === "tableLength" && Number.isInteger(value) && value >= 0 && value <= 32) {
    return encodeNumberAsTableLength(value);
  }
  return encodeNumberAsArithmeticExpression(value);
}

export function replaceConstantWithExpression<T>(_node: T, expression: string): string {
  return expression;
}

export function generateRuntimeConstantDecoder(): string {
  return "local function __num(v)return v end";
}

export function encodeNumberAsArithmeticExpression(value: number): string {
  const delta = Math.trunc(Math.abs(value)) + 17;
  return `((${value + delta})-${delta})`;
}

export function encodeNumberAsStringCharTonumber(value: number): string {
  const codes = String(value).split("").map((ch) => ch.charCodeAt(0)).join(",");
  return `tonumber(string.char(${codes}))`;
}

export function encodeNumberAsTableLength(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    return encodeNumberAsArithmeticExpression(value);
  }
  return `#{${Array.from({ length: value }, () => "0").join(",")}}`;
}

export function encodeNumberAsBitwiseExpression(value: number): string {
  return `bit32 and bit32.bxor(${value},0) or ${encodeNumberAsArithmeticExpression(value)}`;
}
