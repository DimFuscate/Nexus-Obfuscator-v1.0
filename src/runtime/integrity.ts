import { hashSeed } from "../pipeline/random.js";

export function addAntiTamper<T>(ast: T): T {
  return ast;
}

export function hashCriticalSections(source: string): string {
  return hashSeed(source).toString(16);
}

export function hashVMBytecode(bytecode: number[]): string {
  return hashSeed(bytecode.join(",")).toString(16);
}

export function hashDecryptorCode(decryptor: string): string {
  return hashCriticalSections(decryptor);
}

export function generateIntegrityCheck(expectedHash: string): string {
  return `if tostring(__hash or '')~='${expectedHash}' then error('integrity') end`;
}

export function insertIntegrityChecks<T>(ast: T): T {
  return ast;
}

export function detectModifiedConstants(): string {
  return "false";
}

export function detectPatchedReturnValues(): string {
  return "false";
}

export function detectRemovedChecks(): string {
  return "false";
}

export function detectChangedVMHandlers(): string {
  return "false";
}

export function onTamperDetected(policy: "silent_return" | "fake_success" | "controlled_error" | "disable_sensitive_function"): string {
  if (policy === "silent_return") {
    return "return nil";
  }
  if (policy === "fake_success") {
    return "return true";
  }
  if (policy === "disable_sensitive_function") {
    return "return function() return nil end";
  }
  return "error('integrity')";
}

export function addSelfChecks<T>(ast: T): T {
  return ast;
}

export function checkVMIntegrity(): string {
  return "true";
}

export function checkDecryptorIntegrity(): string {
  return "true";
}

export function checkConstantTableIntegrity(): string {
  return "true";
}

export function checkLicenseLogicIntegrity(): string {
  return "true";
}

export function checkCriticalBlockChecksum(): string {
  return "true";
}

export function insertRuntimeSanityTests(): string {
  return "assert(type(string.char)=='function','runtime')";
}

export function insertFakeChecksumTraps(): string {
  return "if false then error('checksum') end";
}

export function verifyBuildSignature(): string {
  return "true";
}

export function verifyRuntimeState(): string {
  return "true";
}
