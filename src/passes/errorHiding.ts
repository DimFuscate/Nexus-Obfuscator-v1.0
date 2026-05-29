import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode } from "../parser/astTypes.js";

export function hideErrors(ast: ProgramNode, _options: ObfuscationOptions): ProgramNode {
  return ast;
}

export function obfuscateErrorMessages(ast: ProgramNode): ProgramNode {
  return ast;
}

export function replaceStackTraces(ast: ProgramNode): ProgramNode {
  return ast;
}

export function wrapSensitiveCallsInPcall(source: string): string {
  return `pcall(function() ${source} end)`;
}

export function generateFakeErrorMessages(): string[] {
  return ["attempt to index nil", "invalid argument #1"];
}

export function generateControlledCrash(): string {
  return "error('runtime')";
}

export function generateSilentFailure(): string {
  return "return nil";
}

export function generateDebugFriendlyErrors(message: string): string {
  return `error(${JSON.stringify(message)})`;
}

export function toggleDebugErrors(enabled: boolean): boolean {
  return enabled;
}
