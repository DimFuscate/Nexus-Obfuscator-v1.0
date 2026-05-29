import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode } from "../parser/astTypes.js";

export interface MacroInfo {
  encryptedStrings: number;
  encryptedNumbers: number;
  encryptedFunctions: number;
  virtualizeFunctions: number;
  noVirtualizeFunctions: number;
  noUpvaluesFunctions: number;
  crashBlocks: number;
  warnings: string[];
}

const MACROS = new Set([
  "LPH_ENCSTR",
  "LPH_STRENC",
  "LPH_ENCNUM",
  "LPH_NUMENC",
  "LPH_ENCFUNC",
  "LPH_FUNCENC",
  "LPH_JIT",
  "LPH_JIT_MAX",
  "LPH_NO_VIRTUALIZE",
  "LPH_NO_UPVALUES",
  "LPH_CRASH",
]);

export function processMacros(ast: ProgramNode, _options: ObfuscationOptions): MacroInfo {
  const info = detectLuraphCompatibleMacros(ast);
  ast.metadata ??= {};
  ast.metadata.macros = info;
  return info;
}

export function addMacroSupport(ast: ProgramNode, options: ObfuscationOptions): MacroInfo {
  return processMacros(ast, options);
}

export function detectLuraphCompatibleMacros(ast: ProgramNode): MacroInfo {
  const info: MacroInfo = {
    encryptedStrings: 0,
    encryptedNumbers: 0,
    encryptedFunctions: 0,
    virtualizeFunctions: 0,
    noVirtualizeFunctions: 0,
    noUpvaluesFunctions: 0,
    crashBlocks: 0,
    warnings: [],
  };

  for (const token of ast.tokens) {
    if (token.type !== "identifier" || !MACROS.has(token.value)) {
      continue;
    }
    if (token.value === "LPH_ENCSTR" || token.value === "LPH_STRENC") {
      info.encryptedStrings += 1;
    } else if (token.value === "LPH_ENCNUM" || token.value === "LPH_NUMENC") {
      info.encryptedNumbers += 1;
    } else if (token.value === "LPH_ENCFUNC" || token.value === "LPH_FUNCENC") {
      info.encryptedFunctions += 1;
    } else if (token.value === "LPH_JIT" || token.value === "LPH_JIT_MAX") {
      info.virtualizeFunctions += 1;
    } else if (token.value === "LPH_NO_VIRTUALIZE") {
      info.noVirtualizeFunctions += 1;
    } else if (token.value === "LPH_NO_UPVALUES") {
      info.noUpvaluesFunctions += 1;
    } else if (token.value === "LPH_CRASH") {
      info.crashBlocks += 1;
    }
  }

  if (info.virtualizeFunctions > 0) {
    info.warnings.push("LPH_JIT macros are recorded; TS virtualization lowering is delegated to the packer fallback.");
  }
  return info;
}

export function expandObfuscatorMacros(ast: ProgramNode): ProgramNode {
  return ast;
}

export function removeMacroCallsFromOutput(ast: ProgramNode): ProgramNode {
  return ast;
}

export function processNoVirtualizeMacro<T>(functionNode: T): T {
  return functionNode;
}

export function processEncryptStringMacro<T>(stringNode: T): T {
  return stringNode;
}

export function processEncryptNumberMacro<T>(numberNode: T): T {
  return numberNode;
}

export function processEncryptFunctionMacro<T>(functionNode: T): T {
  return functionNode;
}

export function processJitMacro<T>(functionNode: T): T {
  return functionNode;
}

export function processJitMaxMacro<T>(functionNode: T): T {
  return functionNode;
}

export function processNoUpvaluesMacro<T>(functionNode: T): T {
  return functionNode;
}

export function processCrashMacro<T>(node: T): T {
  return node;
}
