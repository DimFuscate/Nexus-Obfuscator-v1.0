import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export function insertOpaquePredicates(ast: ProgramNode, _scopeInfo: ScopeInfo, _options: ObfuscationOptions): number {
  ast.metadata ??= {};
  ast.metadata.opaquePredicateCandidates = 1;
  return 1;
}

export function generateMathOpaquePredicate(): string {
  return "((1*1)%2==1)";
}

export function generateTableLengthOpaquePredicate(): string {
  return "(#{true}==1)";
}

export function generateStringOpaquePredicate(): string {
  return "(#'nexus'>0)";
}

export function generateRuntimeOpaquePredicate(): string {
  return "(type(type)=='function')";
}

export function generateVMStateOpaquePredicate(): string {
  return "((__state or 0)==(__state or 0))";
}

export function wrapBlockWithOpaquePredicate(block: string): string {
  return `if ${generateRuntimeOpaquePredicate()} then ${block} end`;
}

export function insertFakeElseBranch(block: string): string {
  return `if ${generateRuntimeOpaquePredicate()} then ${block} else ${generateUnreachable()} end`;
}

function generateUnreachable(): string {
  return "local _=nil";
}
