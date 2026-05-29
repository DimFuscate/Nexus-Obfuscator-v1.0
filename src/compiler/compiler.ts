import type { ProgramNode } from "../parser/astTypes.js";
import type { ObfuscationOptions } from "../pipeline/config.js";
import { emitVMProgram, type VMEmitResult } from "../vm/vm.js";

export interface CompilerDiagnostic {
  level: "warning" | "error";
  message: string;
}

export interface CompilerResult {
  vm?: VMEmitResult;
  diagnostics: CompilerDiagnostic[];
}

export function compileProgram(ast: ProgramNode, options: ObfuscationOptions): CompilerResult {
  const vm = emitVMProgram(ast, options);
  return {
    vm,
    diagnostics: vm
      ? vm.warnings.map((message) => ({ level: "warning", message }))
      : [{ level: "warning", message: "VM compiler does not yet cover this program shape." }],
  };
}
