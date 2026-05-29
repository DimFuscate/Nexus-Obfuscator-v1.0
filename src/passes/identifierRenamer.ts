import type { ObfuscationOptions } from "../pipeline/config.js";
import { createSeededRng, randomIdentifier, type SeededRng } from "../pipeline/random.js";
import type { ProgramNode } from "../parser/astTypes.js";
import type { Scope, ScopeInfo } from "../parser/scopeAnalyzer.js";
import { ROBLOX_PROTECTED_GLOBALS, ROBLOX_PROTECTED_MEMBERS } from "./robloxCompatibility.js";

const reservedGlobals = new Set<string>(ROBLOX_PROTECTED_GLOBALS);

export function renameIdentifiers(ast: ProgramNode, scopeInfo: ScopeInfo, options: ObfuscationOptions): Map<string, string> {
  const rng = createSeededRng(options.seed);
  const unsafe = detectUnsafeRenameTargets(ast);
  const renames = new Map<string, string>();
  for (const record of scopeInfo.locals) {
    if (unsafe.has(record.name) || reservedGlobals.has(record.name)) {
      continue;
    }
    if (!renames.has(record.name)) {
      renames.set(record.name, generateConfusingIdentifier("short", rng));
    }
  }
  ast.metadata ??= {};
  ast.metadata.identifierRenameCandidates = renames.size;
  return renames;
}

export function renameLocalVariables(scope: Scope, nameGenerator: () => string): Map<string, string> {
  const renames = new Map<string, string>();
  for (const name of scope.locals.keys()) {
    if (!reservedGlobals.has(name)) {
      renames.set(name, nameGenerator());
    }
  }
  return renames;
}

export function renameFunctionNames(ast: ProgramNode, nameGenerator: () => string): Map<string, string> {
  const renames = new Map<string, string>();
  for (let i = 0; i < ast.tokens.length - 1; i += 1) {
    if (ast.tokens[i].value === "function" && ast.tokens[i + 1].type === "identifier") {
      const name = ast.tokens[i + 1].value;
      if (!reservedGlobals.has(name)) {
        renames.set(name, nameGenerator());
      }
    }
  }
  return renames;
}

export function renameUpvalues(_ast: ProgramNode, _nameGenerator: () => string): Map<string, string> {
  return new Map();
}

export function renameLabels(_ast: ProgramNode, _nameGenerator: () => string): Map<string, string> {
  return new Map();
}

export function renameSafeTableFields(_ast: ProgramNode, _nameGenerator: () => string): Map<string, string> {
  return new Map();
}

export function generateConfusingIdentifier(style: "short" | "confusing" | "hex" | "randomized", rng: SeededRng): string {
  if (style === "confusing") {
    const chars = "lI1O0";
    return `_${Array.from({ length: rng.int(8, 14) }, () => chars.charAt(rng.int(0, chars.length - 1))).join("")}`;
  }
  if (style === "hex") {
    return `_0x${rng.int(0x100000, 0xffffff).toString(16)}`;
  }
  if (style === "randomized") {
    return randomIdentifier(rng, rng.int(8, 16));
  }
  return `_${rng.int(1000, 999999).toString(36)}`;
}

export function reserveGlobalNames(list: string[]): void {
  for (const name of list) {
    reservedGlobals.add(name);
  }
}

export function detectUnsafeRenameTargets(ast: ProgramNode): Set<string> {
  const unsafe = new Set<string>([...ROBLOX_PROTECTED_GLOBALS, ...ROBLOX_PROTECTED_MEMBERS]);
  for (let i = 0; i < ast.tokens.length; i += 1) {
    const token = ast.tokens[i];
    if (token.value === "getfenv" || token.value === "setfenv" || token.value === "debug") {
      unsafe.add("*dynamic-env*");
    }
    if (token.value === "." || token.value === ":") {
      const next = ast.tokens[i + 1];
      if (next?.type === "identifier") {
        unsafe.add(next.value);
      }
    }
  }
  return unsafe;
}
