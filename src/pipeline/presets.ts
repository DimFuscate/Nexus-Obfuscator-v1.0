import type { ObfuscationOptions, ObfuscationPreset } from "./config.js";

export type PresetDefinition = Pick<
  ObfuscationOptions,
  | "renameIdentifiers"
  | "encryptStrings"
  | "encryptNumbers"
  | "encodeBooleans"
  | "flattenControlFlow"
  | "virtualizeFunctions"
  | "encryptFunctions"
  | "obfuscateTables"
  | "protectGlobals"
  | "injectDeadCode"
  | "insertOpaquePredicates"
  | "minify"
  | "stringCache"
  | "lazyStringDecrypt"
  | "perStringKeys"
  | "perFunctionKeys"
  | "bytecodeEncryption"
  | "opcodeRandomization"
  | "superOperators"
  | "robloxSafeMode"
  | "skipHotLoops"
  | "preserveRobloxNames"
  | "vmMode"
  | "protectionProfile"
  | "stringMode"
  | "deadCodeDensity"
  | "integrityPolicy"
  | "licenseMode"
>;

export const PRESETS: Record<ObfuscationPreset, PresetDefinition> = {
  light: {
    renameIdentifiers: true,
    encryptStrings: true,
    encryptNumbers: false,
    encodeBooleans: false,
    flattenControlFlow: false,
    virtualizeFunctions: false,
    encryptFunctions: false,
    obfuscateTables: false,
    protectGlobals: false,
    injectDeadCode: false,
    insertOpaquePredicates: false,
    minify: true,
    stringCache: true,
    lazyStringDecrypt: true,
    perStringKeys: true,
    perFunctionKeys: false,
    bytecodeEncryption: false,
    opcodeRandomization: false,
    superOperators: false,
    vmMode: "off",
    protectionProfile: "light",
    stringMode: "cached",
    deadCodeDensity: "off",
    integrityPolicy: "silent",
    licenseMode: "off",
    robloxSafeMode: true,
    skipHotLoops: true,
    preserveRobloxNames: true,
  },

  balanced: {
    renameIdentifiers: true,
    encryptStrings: true,
    encryptNumbers: true,
    encodeBooleans: true,
    flattenControlFlow: true,
    virtualizeFunctions: false,
    encryptFunctions: false,
    obfuscateTables: true,
    protectGlobals: false,
    injectDeadCode: true,
    insertOpaquePredicates: true,
    minify: true,
    stringCache: true,
    lazyStringDecrypt: true,
    perStringKeys: true,
    perFunctionKeys: false,
    bytecodeEncryption: false,
    opcodeRandomization: false,
    superOperators: false,
    vmMode: "off",
    protectionProfile: "balanced",
    stringMode: "cached",
    deadCodeDensity: "low",
    integrityPolicy: "silent",
    licenseMode: "off",
    robloxSafeMode: true,
    skipHotLoops: true,
    preserveRobloxNames: true,
  },

  strong: {
    renameIdentifiers: true,
    encryptStrings: true,
    encryptNumbers: true,
    encodeBooleans: true,
    flattenControlFlow: true,
    virtualizeFunctions: "selected",
    encryptFunctions: true,
    obfuscateTables: true,
    protectGlobals: true,
    injectDeadCode: true,
    insertOpaquePredicates: true,
    minify: true,
    stringCache: false,
    lazyStringDecrypt: true,
    perStringKeys: true,
    perFunctionKeys: true,
    bytecodeEncryption: true,
    opcodeRandomization: true,
    superOperators: false,
    vmMode: "selected",
    protectionProfile: "strong",
    stringMode: "no-cache",
    deadCodeDensity: "medium",
    integrityPolicy: "controlled-error",
    licenseMode: "client-hook",
    robloxSafeMode: true,
    skipHotLoops: true,
    preserveRobloxNames: true,
  },

  maximum: {
    renameIdentifiers: true,
    encryptStrings: true,
    encryptNumbers: true,
    encodeBooleans: true,
    flattenControlFlow: true,
    virtualizeFunctions: true,
    encryptFunctions: true,
    obfuscateTables: true,
    protectGlobals: true,
    injectDeadCode: true,
    insertOpaquePredicates: true,
    minify: true,
    stringCache: false,
    lazyStringDecrypt: true,
    perStringKeys: true,
    perFunctionKeys: true,
    bytecodeEncryption: true,
    opcodeRandomization: true,
    superOperators: true,
    vmMode: "full",
    protectionProfile: "maximum",
    stringMode: "no-cache",
    deadCodeDensity: "high",
    integrityPolicy: "controlled-error",
    licenseMode: "signed-response",
    robloxSafeMode: true,
    skipHotLoops: true,
    preserveRobloxNames: true,
  },

  enterprise: {
    renameIdentifiers: true,
    encryptStrings: true,
    encryptNumbers: true,
    encodeBooleans: true,
    flattenControlFlow: true,
    virtualizeFunctions: true,
    encryptFunctions: true,
    obfuscateTables: true,
    protectGlobals: true,
    injectDeadCode: true,
    insertOpaquePredicates: true,
    minify: true,
    stringCache: false,
    lazyStringDecrypt: true,
    perStringKeys: true,
    perFunctionKeys: true,
    bytecodeEncryption: true,
    opcodeRandomization: true,
    superOperators: true,
    vmMode: "full",
    protectionProfile: "enterprise",
    stringMode: "no-cache",
    deadCodeDensity: "high",
    integrityPolicy: "controlled-error",
    licenseMode: "signed-response",
    robloxSafeMode: true,
    skipHotLoops: true,
    preserveRobloxNames: true,
  },
};

export function applyPreset(options: ObfuscationOptions): ObfuscationOptions {
  return {
    ...options,
    ...PRESETS[options.preset],
  };
}

export function pythonLevelForPreset(preset: ObfuscationPreset): "light" | "medium" | "max" {
  if (preset === "light") {
    return "light";
  }
  if (preset === "balanced") {
    return "medium";
  }
  return "max";
}
