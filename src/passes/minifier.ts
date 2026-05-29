import type { ObfuscationOptions } from "../pipeline/config.js";
import { buildAST } from "../parser/luauParser.js";

export function minifyLua(source: string, options?: Partial<ObfuscationOptions>): string {
  if (options?.debugBuild || options?.preserveLineNumbers) {
    return source;
  }
  const ast = buildAST(source, options?.dialect ?? "luau");
  const out: string[] = [];
  let previousType = "";
  for (const token of ast.tokens) {
    if (token.type === "eof" || token.type === "comment") {
      continue;
    }
    if (token.type === "whitespace") {
      previousType = token.type;
      continue;
    }
    const previous = out[out.length - 1] ?? "";
    if (needsSpace(previous, token.value, previousType)) {
      out.push(" ");
    }
    out.push(token.value);
    previousType = token.type;
  }
  return out.join("");
}

export function minifyOutput(source: string): string {
  return minifyLua(source, { dialect: "luau" });
}

export function removeWhitespace(source: string): string {
  return minifyLua(source, { dialect: "luau" });
}

export function removeComments(source: string): string {
  return buildAST(source, "luau").tokens.filter((token) => token.type !== "comment" && token.type !== "eof").map((token) => token.value).join("");
}

export function packConstantTables<T>(ast: T): T {
  return ast;
}

export function compressVMBytecode(bytecode: number[]): number[] {
  return bytecode;
}

export function encodePackedData(data: number[], encoding: "base64" | "decimal array" | "hex array" = "decimal array"): string {
  if (encoding === "base64") {
    return Buffer.from(data).toString("base64");
  }
  if (encoding === "hex array") {
    return data.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return data.join(",");
}

export function decodePackedDataAtRuntime(payload: string): string {
  return payload;
}

export function chunkPackedData(data: number[], chunkSize: number): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

export function generateSingleLineOutput(source: string): string {
  return source.replace(/\s*\n\s*/g, " ");
}

export function generatePrettyDebugOutput(source: string): string {
  return source;
}

function needsSpace(previous: string, current: string, previousType: string): boolean {
  if (!previous || previousType === "whitespace") {
    return false;
  }
  return /[A-Za-z0-9_]/.test(previous.charAt(previous.length - 1)) && /[A-Za-z0-9_]/.test(current.charAt(0));
}
