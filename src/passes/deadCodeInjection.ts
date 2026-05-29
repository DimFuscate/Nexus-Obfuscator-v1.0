import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export function injectDeadCode(ast: ProgramNode, _scopeInfo: ScopeInfo, _options: ObfuscationOptions): number {
  ast.metadata ??= {};
  ast.metadata.deadCodeCandidates = 1;
  return 1;
}

export function generateFakeFunction(): string {
  return "local function __nexus_fake() return nil end";
}

export function generateFakeBranch(): string {
  return "if #{}==1 then return nil end";
}

export function generateFakeLicenseCheck(): string {
  return "local __fake_license=true";
}

export function generateFakeStringDecryptor(): string {
  return "local function __fake_dec(x)return x end";
}

export function generateFakeAPIEndpoint(): string {
  return "local __fake_endpoint='https://127.0.0.1/'";
}

export function generateFakeVMChunk(): string {
  return "local __fake_chunk={c={},k={}}";
}

export function generateFakeErrorPath(): string {
  return "if false then error('runtime') end";
}

export function generateUnreachableBlock(): string {
  return "if false then local _=0 end";
}

export function insertDeadCodeIntoFunction<T>(functionNode: T): T {
  return functionNode;
}

export function controlDeadCodeDensity(level: "low" | "medium" | "high" | "insane"): number {
  return { low: 1, medium: 3, high: 7, insane: 15 }[level];
}
