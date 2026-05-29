import type { LuaDialect, ObfuscationOptions } from "./config.js";

export function setLuaDialect(dialect: LuaDialect): Partial<ObfuscationOptions> {
  return { dialect };
}

export function enableLua51Compatibility(): Partial<ObfuscationOptions> {
  return { dialect: "lua51" };
}

export function enableLua52Compatibility(): Partial<ObfuscationOptions> {
  return { dialect: "lua52" };
}

export function enableLua53Compatibility(): Partial<ObfuscationOptions> {
  return { dialect: "lua53" };
}

export function enableLua54Compatibility(): Partial<ObfuscationOptions> {
  return { dialect: "lua54" };
}

export function enableLuauCompatibility(): Partial<ObfuscationOptions> {
  return { dialect: "luau", target: "roblox", robloxSafeMode: true };
}

export function disableDebugLibraryDependency(): Partial<ObfuscationOptions> {
  return {};
}

export function disableLoadstringDependency(): Partial<ObfuscationOptions> {
  return { virtualizeFunctions: false };
}

export function disableBitLibraryDependency(): Partial<ObfuscationOptions> {
  return {};
}

export function enableMobileSafeMode(): Partial<ObfuscationOptions> {
  return { robloxSafeMode: true, skipHotLoops: true };
}

export function enableStrictModeCompatibility(): Partial<ObfuscationOptions> {
  return { preserveRobloxNames: true };
}

export function preserveLineNumbers(): Partial<ObfuscationOptions> {
  return { preserveLineNumbers: true };
}

export function preserveDebugBuildMode(): Partial<ObfuscationOptions> {
  return { debugBuild: true, minify: false };
}
