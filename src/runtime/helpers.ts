export function addAntiDumpProtection<T>(ast: T): T {
  return ast;
}

export function avoidPlaintextRuntimeSource(): boolean {
  return true;
}

export function avoidFullPlaintextBytecode(): boolean {
  return true;
}

export function lazyDecryptConstants(): string {
  return "__lazy_constants";
}

export function destroyTemporaryTables(): string {
  return "for k in pairs(__tmp or {}) do __tmp[k]=nil end";
}

export function clearDecryptedBuffers(): string {
  return destroyTemporaryTables();
}

export function hideBytecodeInClosures(payload = ""): string {
  return `function() return ${JSON.stringify(payload)} end`;
}

export function hideConstantsInClosures(payload = ""): string {
  return hideBytecodeInClosures(payload);
}

export function useWeakTablesForCaches(): string {
  return "setmetatable({}, {__mode='kv'})";
}

export function randomizeTableStorage<T>(table: T): T {
  return table;
}

export function detectMassConstantAccess(): string {
  return "false";
}

export function secureEraseTable(tbl = "__tbl"): string {
  return `for k in pairs(${tbl}) do ${tbl}[k]=nil end`;
}

export function createEphemeralDecryptor(): string {
  return "function(f,...) local r={f(...)}; f=nil; return table.unpack and table.unpack(r) or unpack(r) end";
}

export function createOneTimeUseClosure(payload: string): string {
  return `local __used=false;return function() if __used then return nil end;__used=true;return ${payload} end`;
}
