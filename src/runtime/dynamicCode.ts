import type { ProgramNode } from "../parser/astTypes.js";
import type { ObfuscationOptions } from "../pipeline/config.js";

export function addDynamicCodeGeneration(ast: ProgramNode, _options: ObfuscationOptions): ProgramNode {
  return ast;
}

export function generateRuntimeDecryptorFactory(): string {
  return "local function __factory(f)return f end";
}

export function generateRuntimeDispatchTable(): string {
  return "local __dispatch={}";
}

export function generateRuntimeConstantFactory(): string {
  return "local function __const(v)return v end";
}

export function generateRuntimeWrapperFactory(): string {
  return "local function __wrap(f)return function(...)return f(...)end end";
}

export function generateDynamicLoadstringChunk(source: string): string {
  return `local __load=loadstring; if __load then return __load(${JSON.stringify(source)})() end`;
}

export function disableDynamicCodeWhenUnavailable(): string {
  return "if not loadstring then return nil end";
}

export function detectLoadstringAvailability(): string {
  return "loadstring~=nil";
}

export function fallbackWithoutLoadstring(source = ""): string {
  return source;
}
