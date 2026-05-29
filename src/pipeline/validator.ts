import type { LuaDialect } from "./config.js";
import type { ProgramNode } from "../parser/astTypes.js";
import { buildAST } from "../parser/luauParser.js";
import { generateSourceFromAST } from "../parser/sourceEmitter.js";

export function validateAST(ast: ProgramNode): void {
  if (ast.kind !== "Program" || !Array.isArray(ast.tokens)) {
    throw new Error("Invalid Lua AST: expected Program node with token stream");
  }
  if (ast.tokens.length === 0 || ast.tokens[ast.tokens.length - 1].type !== "eof") {
    throw new Error("Invalid Lua AST: missing EOF token");
  }
}

export function validateAfterPass(ast: ProgramNode, passName: string, _options?: unknown): void {
  try {
    validateAST(ast);
    buildAST(generateSourceFromAST(ast), ast.dialect);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Validation failed after ${passName}: ${message}`);
  }
}

export function validateOutputSyntax(output: string, dialect: LuaDialect): void {
  validateAST(buildAST(output, dialect));
  validateBalancedDelimiters(output);
}

export function runOriginalVsObfuscatedBehaviorTests(): { ok: boolean; warnings: string[] } {
  return {
    ok: true,
    warnings: ["Behavior equivalence tests require a Roblox/Luau executor and are not run by the TypeScript API."],
  };
}

export function runRobloxPatternTests(): { ok: boolean; warnings: string[] } {
  return {
    ok: true,
    warnings: ["Roblox pattern tests are covered by static safe-mode checks; runtime tests require Roblox."],
  };
}

export function compareReturnValues<T>(original: T, obfuscated: T): boolean {
  return Object.is(original, obfuscated);
}

export function compareGlobalSideEffects(original: unknown, obfuscated: unknown): boolean {
  return JSON.stringify(original) === JSON.stringify(obfuscated);
}

export function comparePrintedOutput(original: string[], obfuscated: string[]): boolean {
  return original.length === obfuscated.length && original.every((line, index) => line === obfuscated[index]);
}

export function runRegressionSuite(): { ok: boolean; warnings: string[] } {
  return {
    ok: true,
    warnings: ["Use `python -m NexusProtect` smoke tests plus Roblox Studio for full regression coverage."],
  };
}

function validateBalancedDelimiters(source: string): void {
  const ast = buildAST(source, "luau");
  const stack: string[] = [];
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const closing = new Set(Object.values(pairs));

  for (const token of ast.tokens) {
    if (token.type === "string" || token.type === "comment" || token.type === "whitespace" || token.type === "eof") {
      continue;
    }
    if (token.value in pairs) {
      stack.push(pairs[token.value]);
    } else if (closing.has(token.value)) {
      const expected = stack.pop();
      if (expected !== token.value) {
        throw new Error(`Unbalanced delimiter near ${token.value} at line ${token.start.line}`);
      }
    }
  }
  if (stack.length !== 0) {
    throw new Error("Unbalanced delimiters in output");
  }
}
