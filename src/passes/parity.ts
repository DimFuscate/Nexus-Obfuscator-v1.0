import type { ProgramNode } from "../parser/astTypes.js";
import type { ObfuscationOptions } from "../pipeline/config.js";

export interface ParityPassResult {
  pass: string;
  changed: boolean;
  warnings: string[];
}

export function wrapInFunction(ast: ProgramNode, _options: ObfuscationOptions): ParityPassResult {
  ast.metadata ??= {};
  ast.metadata.wrapInFunction = true;
  return { pass: "WrapInFunction", changed: false, warnings: [] };
}

export function addVararg(ast: ProgramNode, _options: ObfuscationOptions): ParityPassResult {
  ast.metadata ??= {};
  ast.metadata.addVararg = true;
  return { pass: "AddVararg", changed: false, warnings: [] };
}

export function buildConstantArray(ast: ProgramNode, _options: ObfuscationOptions): ParityPassResult {
  ast.metadata ??= {};
  ast.metadata.constantArrayCandidates = ast.tokens.filter((token) => token.type === "string" || token.type === "number").length;
  return { pass: "ConstantArray", changed: false, warnings: [] };
}

export function splitStrings(ast: ProgramNode, _options: ObfuscationOptions): ParityPassResult {
  ast.metadata ??= {};
  ast.metadata.splitStringCandidates = ast.tokens.filter((token) => token.type === "string" && token.value.length > 64).length;
  return { pass: "SplitStrings", changed: false, warnings: [] };
}

export function proxifyLocals(ast: ProgramNode, _options: ObfuscationOptions): ParityPassResult {
  ast.metadata ??= {};
  ast.metadata.proxifyLocals = true;
  return { pass: "ProxifyLocals", changed: false, warnings: [] };
}

export function watermarkCheck(ast: ProgramNode, options: ObfuscationOptions): ParityPassResult {
  ast.metadata ??= {};
  ast.metadata.watermarkCheck = Boolean(options.watermark);
  return { pass: "WatermarkCheck", changed: false, warnings: [] };
}

export function runParityPasses(ast: ProgramNode, options: ObfuscationOptions): ParityPassResult[] {
  return [
    wrapInFunction(ast, options),
    addVararg(ast, options),
    buildConstantArray(ast, options),
    splitStrings(ast, options),
    proxifyLocals(ast, options),
    watermarkCheck(ast, options),
  ];
}
