import type { ObfuscationOptions, ObfuscationPreset } from "./config.js";
import type { ProgramNode } from "../parser/astTypes.js";
import { PRESETS } from "./presets.js";

export function addPerformanceControls(options: ObfuscationOptions): ObfuscationOptions {
  return { ...options, skipHotLoops: true };
}

export function setProtectionPreset(level: ObfuscationPreset): Partial<ObfuscationOptions> {
  return { preset: level, ...PRESETS[level] };
}

export function skipHotFunctions(ast: ProgramNode): ProgramNode {
  ast.metadata ??= {};
  ast.metadata.hotLoops = detectHotLoops(ast);
  return ast;
}

export function detectHotLoops(ast: ProgramNode): number {
  const source = ast.source;
  let count = 0;
  for (const marker of ["while true do task.wait", "while task.wait", "RenderStepped", "Heartbeat", "Stepped"]) {
    if (source.includes(marker)) {
      count += 1;
    }
  }
  return count;
}

export function detectRenderLoops(ast: ProgramNode): number {
  return ["RenderStepped", "Heartbeat", "Stepped"].reduce((count, marker) => count + (ast.source.includes(marker) ? 1 : 0), 0);
}

export function applyNoVirtualizeMacros(ast: ProgramNode): ProgramNode {
  return ast;
}

export function benchmarkOriginal(source: string): number {
  return source.length;
}

export function benchmarkObfuscated(source: string): number {
  return source.length;
}

export function estimateRuntimeCost(ast: ProgramNode): string {
  return detectHotLoops(ast) > 0 ? "medium" : "low";
}

export function generatePerformanceReport(): string {
  return "Static estimate only; run inside Roblox Studio for authoritative timings.";
}
