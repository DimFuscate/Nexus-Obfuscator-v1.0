import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode } from "../parser/astTypes.js";
import type { ScopeInfo, SymbolRecord } from "../parser/scopeAnalyzer.js";
import { ROBLOX_PROTECTED_GLOBALS } from "./robloxCompatibility.js";

export function protectGlobals(ast: ProgramNode, scopeInfo: ScopeInfo, options: ObfuscationOptions): SymbolRecord[] {
  const globals = collectGlobalReferences(ast, scopeInfo).filter((record) => {
    if (options.robloxSafeMode && ROBLOX_PROTECTED_GLOBALS.has(record.name)) {
      return false;
    }
    return true;
  });
  ast.metadata ??= {};
  ast.metadata.globalProtectionCandidates = globals.length;
  return globals;
}

export function collectGlobalReferences(_ast: ProgramNode, scopeInfo?: ScopeInfo): SymbolRecord[] {
  return scopeInfo?.globals ?? [];
}

export function cacheGlobalsAsLocals(ast: ProgramNode): ProgramNode {
  return ast;
}

export function wrapGlobalAccess(ast: ProgramNode): ProgramNode {
  return ast;
}

export function verifyGlobalIdentity(name: string): string {
  return `type(${name})~='nil'`;
}

export function detectGlobalTampering(name: string): string {
  return `not (${verifyGlobalIdentity(name)})`;
}

export function createEnvironmentProxy(): string {
  return "local __env=(getfenv and getfenv()) or {}";
}

export function protectEnvironmentTable(): string {
  return createEnvironmentProxy();
}

export function protectImportantGlobals(list: string[]): string {
  return list.map((name) => `local __${name}=(${createEnvironmentProxy()})[${JSON.stringify(name)}]`).join(";");
}
