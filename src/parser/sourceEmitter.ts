import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode } from "./astTypes.js";

export function generateSourceFromAST(ast: ProgramNode, _options?: Partial<ObfuscationOptions>): string {
  return ast.tokens.filter((token) => token.type !== "eof").map((token) => token.value).join("");
}

export function emitLua(ast: ProgramNode, options?: Partial<ObfuscationOptions>): string {
  return generateSourceFromAST(ast, options);
}

export function preserveSourceMap(ast: ProgramNode): unknown {
  return {
    dialect: ast.dialect,
    tokens: ast.tokens.length,
  };
}
