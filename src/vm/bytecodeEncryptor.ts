import { hashSeed } from "../pipeline/random.js";
import type { VMChunk, VMInstruction } from "./bytecode.js";

export function encryptBytecode(bytecode: VMInstruction[], key: string): number[] {
  const data = Buffer.from(JSON.stringify(bytecode), "utf8");
  return cryptBytes([...data], hashSeed(key), 1);
}

export function decryptBytecodeAtRuntime(payload: number[], key: string): number[] {
  return cryptBytes(payload, hashSeed(key), -1);
}

export function deriveBytecodeKey(buildKey: string, runtimeData: string): string {
  return hashSeed(`${buildKey}:${runtimeData}`).toString(16);
}

export function encryptBytecodeChunks(chunks: VMChunk[], key = "nexus"): number[][] {
  return chunks.map((chunk, index) => encryptBytecode(chunk.c, `${key}:${index}`));
}

export function decryptChunkOnDemand(chunkId: number): string {
  return `__decode_chunk(${chunkId})`;
}

export function reencryptChunkAfterExecution(chunkId: number): string {
  return `__reencrypt_chunk(${chunkId})`;
}

export function addBytecodePadding(bytecode: VMInstruction[]): VMInstruction[] {
  return [...bytecode, { op: 0 }];
}

export function insertFakeBytecodeBlocks(bytecode: VMInstruction[]): VMInstruction[] {
  return addBytecodePadding(bytecode);
}

export function verifyBytecodeIntegrity(bytecode: VMInstruction[]): string {
  return hashSeed(JSON.stringify(bytecode)).toString(16);
}

function cryptBytes(bytes: number[], key: number, direction: 1 | -1): number[] {
  let state = key || 1;
  return bytes.map((byte) => {
    state = Math.imul(state ^ 0x45d9f3b, 2654435761) >>> 0;
    return (byte + direction * (state & 255)) & 255;
  });
}
