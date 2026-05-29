import type { ObfuscationOptions } from "../pipeline/config.js";
import type { ProgramNode, LuaToken } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export interface EncryptedStringPayload {
  id: number;
  data: number[];
  key: number;
  algorithm: "xorRolling" | "rc4Like" | "byteRotate";
}

export function encryptStrings(ast: ProgramNode, _scopeInfo: ScopeInfo, _options: ObfuscationOptions): EncryptedStringPayload[] {
  const literals = collectStringLiterals(ast);
  ast.metadata ??= {};
  ast.metadata.stringLiteralCount = literals.length;
  return literals.map((token, id) => encryptStringLiteral(token.value, 17 + id, "xorRolling"));
}

export function collectStringLiterals(ast: ProgramNode): LuaToken[] {
  return ast.tokens.filter((token) => token.type === "string");
}

export function encryptStringLiteral(
  value: string,
  key: number,
  algorithm: EncryptedStringPayload["algorithm"] = "xorRolling",
): EncryptedStringPayload {
  const bytes = [...Buffer.from(value, "utf8")];
  const data = algorithm === "rc4Like"
    ? rc4LikeEncrypt(bytes, key)
    : algorithm === "byteRotate"
      ? byteRotateEncrypt(bytes, key)
      : xorRollingEncrypt(bytes, key);
  return { id: 0, data, key, algorithm };
}

export function generateStringDecryptor(_algorithm: string, options: ObfuscationOptions): string {
  const cacheLine = options.stringCache ? "if __S[id] then return __S[id] end" : "";
  const storeLine = options.stringCache ? "__S[id]=s" : "";
  return `local __S={};local function __bx(a,b)local r=0;local p=1;while a>0 or b>0 do local aa=a%2;local bb=b%2;if aa~=bb then r=r+p end;a=(a-aa)/2;b=(b-bb)/2;p=p*2 end;return r end;local function __dec(id)local e=__DATA[id];${cacheLine};local k=__KEYS[id];local o={};for i=1,#e do o[i]=string.char(__bx(e[i],(k+i*31)%255)%256) end;local s=table.concat(o);${storeLine};return s end`;
}

export function replaceStringWithDecryptCall<T>(_node: T, encryptedPayload: EncryptedStringPayload): string {
  return `__dec(${encryptedPayload.id})`;
}

export function splitEncryptedString(payload: number[], chunkSize: number): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < payload.length; i += chunkSize) {
    chunks.push(payload.slice(i, i + chunkSize));
  }
  return chunks;
}

export function lazyDecryptString(id: number): string {
  return `__dec(${id})`;
}

export function cacheDecryptedString(id: number, value: string): [number, string] {
  return [id, value];
}

export function disableStringCache(): false {
  return false;
}

export function encryptTableKeys(ast: ProgramNode): ProgramNode {
  return ast;
}

export function encryptMethodNames(ast: ProgramNode): ProgramNode {
  return ast;
}

export function xorRollingEncrypt(bytes: number[], key: number): number[] {
  return bytes.map((byte, index) => xorByte(byte, (key + (index + 1) * 31) % 255) % 256);
}

export function xorRollingDecrypt(bytes: number[], key: number): number[] {
  return xorRollingEncrypt(bytes, key);
}

export function rc4LikeEncrypt(bytes: number[], key: number): number[] {
  const s = Array.from({ length: 256 }, (_, index) => index);
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + s[i] + ((key + i * 13) & 255)) & 255;
    [s[i], s[j]] = [s[j], s[i]];
  }
  let i = 0;
  j = 0;
  return bytes.map((byte) => {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    [s[i], s[j]] = [s[j], s[i]];
    return xorByte(byte, s[(s[i] + s[j]) & 255]);
  });
}

export function rc4LikeDecrypt(bytes: number[], key: number): number[] {
  return rc4LikeEncrypt(bytes, key);
}

export function byteRotateEncrypt(bytes: number[], key: number): number[] {
  const shift = key & 7;
  return bytes.map((byte) => ((byte << shift) | (byte >>> (8 - shift))) & 255);
}

export function byteRotateDecrypt(bytes: number[], key: number): number[] {
  const shift = key & 7;
  return bytes.map((byte) => ((byte >>> shift) | (byte << (8 - shift))) & 255);
}

export function base85Encode(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 4) {
    const chunk = bytes.slice(i, i + 4);
    while (chunk.length < 4) {
      chunk.push(0);
    }
    let value = (((chunk[0] << 24) >>> 0) + (chunk[1] << 16) + (chunk[2] << 8) + chunk[3]) >>> 0;
    const encoded = Array.from({ length: 5 }, () => {
      const digit = value % 85;
      value = Math.floor(value / 85);
      return String.fromCharCode(digit + 33);
    }).reverse().join("");
    out += encoded.slice(0, bytes.length - i >= 4 ? 5 : bytes.length - i + 1);
  }
  return out;
}

export function base85Decode(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 5) {
    const chunk = text.slice(i, i + 5);
    const padded = chunk.padEnd(5, "u");
    let value = 0;
    for (const ch of padded) {
      value = value * 85 + (ch.charCodeAt(0) - 33);
    }
    const bytes = [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ];
    out.push(...bytes.slice(0, chunk.length === 5 ? 4 : chunk.length - 1));
  }
  return out;
}

export function chunkedStringEncode(bytes: number[]): string[] {
  return splitEncryptedString(bytes, 96).map((chunk) => base85Encode(chunk));
}

export function chunkedStringDecode(chunks: string[]): number[] {
  return chunks.flatMap((chunk) => base85Decode(chunk));
}

function xorByte(a: number, b: number): number {
  let out = 0;
  let bit = 1;
  while (a > 0 || b > 0) {
    const aa = a % 2;
    const bb = b % 2;
    if (aa !== bb) {
      out += bit;
    }
    a = Math.floor(a / 2);
    b = Math.floor(b / 2);
    bit *= 2;
  }
  return out;
}
