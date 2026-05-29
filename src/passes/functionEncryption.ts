import type { ObfuscationOptions } from "../pipeline/config.js";
import { hashSeed } from "../pipeline/random.js";
import type { ProgramNode } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export function encryptFunctions(ast: ProgramNode, _scopeInfo: ScopeInfo, _options: ObfuscationOptions): number {
  const count = selectSensitiveFunctions(ast, "safe").length;
  ast.metadata ??= {};
  ast.metadata.functionEncryptionCandidates = count;
  return count;
}

export function selectSensitiveFunctions(ast: ProgramNode, _policy: string): number[] {
  const indexes: number[] = [];
  ast.tokens.forEach((token, index) => {
    if (token.value === "function") {
      indexes.push(index);
    }
  });
  return indexes;
}

export function serializeFunctionBody(functionNode: string): string {
  return functionNode;
}

export function encryptFunctionPayload(serialized: string, key: string): string {
  const numericKey = hashSeed(key) & 255;
  return [...Buffer.from(serialized, "utf8")].map((byte) => (byte + numericKey) & 255).join(",");
}

export function replaceFunctionWithEncryptedWrapper(serialized: string): string {
  return `function(...) return (${serialized})(...) end`;
}

export function decryptFunctionOnFirstCall(wrapper: string): string {
  return wrapper;
}

export function reencryptFunctionAfterCall(wrapper: string): string {
  return wrapper;
}

export function deriveFunctionKey(functionId: string, buildKey: string): string {
  return hashSeed(`${buildKey}:${functionId}`).toString(16);
}

export function addFunctionIntegrityCheck(functionPayload: string): string {
  return `${functionPayload}`;
}
