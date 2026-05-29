import type { ObfuscationOptions } from "../pipeline/config.js";
import type { LuaToken, ProgramNode } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export function encodeBooleansAndNil(ast: ProgramNode, _scopeInfo: ScopeInfo, _options: ObfuscationOptions): LuaToken[] {
  const tokens = [...collectBooleanConstants(ast), ...collectNilConstants(ast)];
  ast.metadata ??= {};
  ast.metadata.booleanNilConstantCount = tokens.length;
  return tokens;
}

export function collectBooleanConstants(ast: ProgramNode): LuaToken[] {
  return ast.tokens.filter((token) => token.type === "keyword" && (token.value === "true" || token.value === "false"));
}

export function collectNilConstants(ast: ProgramNode): LuaToken[] {
  return ast.tokens.filter((token) => token.type === "keyword" && token.value === "nil");
}

export function encodeBooleanConstant(value: boolean, _strategy = "opaque"): string {
  return value ? encodeBooleanAsOpaqueExpression(true) : encodeBooleanAsOpaqueExpression(false);
}

export function encodeNilExpression(_strategy = "impossibleLookup"): string {
  return "({})[math.random(999999,999999)]";
}

export function encodeBooleanAsOpaqueExpression(value: boolean): string {
  return value ? "(#{1}==1)" : "(#{}==1)";
}
