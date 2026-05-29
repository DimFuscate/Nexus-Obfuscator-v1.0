import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export function obfuscateTables(ast: ProgramNode, _scopeInfo: ScopeInfo, _options: ObfuscationOptions): ProgramNode {
  ast.metadata ??= {};
  ast.metadata.tableAccessCandidates = ast.tokens.filter((token) => token.value === ".").length;
  return ast;
}

export function encryptTableKeys(ast: ProgramNode): ProgramNode {
  return ast;
}

export function replaceDotAccessWithComputedAccess(ast: ProgramNode): ProgramNode {
  return ast;
}

export function shuffleTableLiterals(ast: ProgramNode): ProgramNode {
  return ast;
}

export function wrapTableWithProxy<T>(tableNode: T): T {
  return tableNode;
}

export function generateMetatableProxy(): string {
  return "local __proxy=setmetatable({},{__index=function(t,k)return rawget(t,k)end})";
}

export function generateFakeMetatable(): string {
  return "setmetatable({},{__mode='kv'})";
}

export function obfuscateIndexAccess<T>(node: T): T {
  return node;
}

export function obfuscateNewIndexAccess<T>(node: T): T {
  return node;
}

export function hideConfigTables(ast: ProgramNode): ProgramNode {
  return ast;
}

export function hideConstantTables(ast: ProgramNode): ProgramNode {
  return ast;
}
