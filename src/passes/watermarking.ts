import { hashSeed } from "../pipeline/random.js";
import type { ProgramNode } from "../parser/astTypes.js";

export interface WatermarkInfo {
  buyer_id?: string;
  build_id: string;
  timestamp: string;
  project_id?: string;
  nonce: string;
}

export function addWatermark(ast: ProgramNode, buildInfo: Partial<WatermarkInfo>): ProgramNode {
  ast.metadata ??= {};
  ast.metadata.watermark = generateBuildWatermark(buildInfo.build_id ?? hashSeed(Date.now().toString()).toString(16));
  return ast;
}

export function generateBuyerWatermark(buyerId: string): WatermarkInfo {
  return generateBuildWatermark(hashSeed(buyerId).toString(16), buyerId);
}

export function generateBuildWatermark(buildId: string, buyerId?: string): WatermarkInfo {
  return {
    buyer_id: buyerId,
    build_id: buildId,
    timestamp: new Date().toISOString(),
    project_id: "Protect.Nexus",
    nonce: hashSeed(`${buildId}:${Math.random()}`).toString(16),
  };
}

export function embedWatermarkInIdentifiers(ast: ProgramNode, watermark: WatermarkInfo): ProgramNode {
  ast.metadata ??= {};
  ast.metadata.identifierWatermark = watermark.build_id;
  return ast;
}

export function embedWatermarkInFakeConstants(ast: ProgramNode, watermark: WatermarkInfo): ProgramNode {
  ast.metadata ??= {};
  ast.metadata.constantWatermark = watermark.nonce;
  return ast;
}

export function embedWatermarkInVMOpcodeOrder<T>(vmSpec: T, _watermark: WatermarkInfo): T {
  return vmSpec;
}

export function embedWatermarkInStringChunkOrder<T>(chunks: T, _watermark: WatermarkInfo): T {
  return chunks;
}

export function extractWatermarkFromOutput(source: string): string | undefined {
  const match = source.match(/Protect\.Nexus v([0-9.]+)/);
  return match?.[1];
}

export function verifyWatermark(source: string, expected: string): boolean {
  return source.includes(expected);
}
