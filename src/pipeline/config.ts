export type LuaDialect = "lua51" | "lua52" | "lua53" | "lua54" | "luau";
export type ObfuscationTarget = "generic" | "roblox";
export type ObfuscationPreset = "light" | "balanced" | "strong" | "maximum" | "enterprise";
export type VMMode = "off" | "selected" | "full";
export type StringMode = "cached" | "lazy" | "no-cache";
export type DeadCodeDensity = "off" | "low" | "medium" | "high";
export type IntegrityPolicy = "silent" | "fake-success" | "controlled-error";
export type LicenseMode = "off" | "client-hook" | "signed-response";

export interface WatermarkOptions {
  buyerId?: string;
  buildId?: string;
  hidden?: boolean;
}

export interface ObfuscationOptions {
  dialect: LuaDialect;
  target: ObfuscationTarget;
  preset: ObfuscationPreset;
  seed?: string;

  renameIdentifiers: boolean;
  encryptStrings: boolean;
  encryptNumbers: boolean;
  encodeBooleans: boolean;
  flattenControlFlow: boolean;
  virtualizeFunctions: boolean | "selected";
  encryptFunctions: boolean;
  obfuscateTables: boolean;
  protectGlobals: boolean;
  injectDeadCode: boolean;
  insertOpaquePredicates: boolean;
  minify: boolean;

  stringCache: boolean;
  lazyStringDecrypt: boolean;
  perStringKeys: boolean;
  perFunctionKeys: boolean;
  bytecodeEncryption: boolean;
  opcodeRandomization: boolean;
  superOperators: boolean;

  robloxSafeMode: boolean;
  skipHotLoops: boolean;
  preserveRobloxNames: boolean;
  preserveLineNumbers?: boolean;
  debugBuild?: boolean;
  forceVirtualize?: boolean;
  vmMode: VMMode;
  protectionProfile: ObfuscationPreset;
  stringMode: StringMode;
  deadCodeDensity: DeadCodeDensity;
  integrityPolicy: IntegrityPolicy;
  licenseMode: LicenseMode;

  output?: string;
  watermark?: string | WatermarkOptions;
  report?: string;
}

export interface BuildReport {
  inputBytes: number;
  outputBytes: number;
  stringsEncrypted: number;
  numbersEncoded: number;
  booleansEncoded: number;
  functionsVirtualized: number;
  functionsSkippedHotPath: number;
  functionsEncrypted: number;
  identifiersRenamed: number;
  tablesObfuscated: number;
  globalsProtected: number;
  fakeBlocksInserted: number;
  opaquePredicatesInserted: number;
  vmChunks: number;
  vmInstructions: number;
  vmConstants: number;
  vmRuntimeBytes: number;
  vmUnsupportedFunctions: number;
  watermarksEmbedded: number;
  integrityChecksInserted: number;
  licenseHooksInserted: number;
  warnings: string[];
  estimatedSlowdown: string;
}

export interface ObfuscationResult {
  code: string;
  map?: unknown;
  report: BuildReport;
  warnings: string[];
}

export type ObfuscationInputOptions = Partial<ObfuscationOptions> & {
  dialect?: LuaDialect;
  target?: ObfuscationTarget;
  preset?: ObfuscationPreset;
};

export const RUNTIME_DEFAULTS = {
  watermark: "nexus",
};

export const DEFAULT_OPTIONS: ObfuscationOptions = {
  dialect: "luau",
  target: "roblox",
  preset: "strong",
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
  licenseMode: "off",
  robloxSafeMode: true,
  skipHotLoops: true,
  preserveRobloxNames: true,
  ...RUNTIME_DEFAULTS,
};

export function resolveOptions(input: ObfuscationInputOptions = {}): ObfuscationOptions {
  const preset = input.preset ?? DEFAULT_OPTIONS.preset;
  const protectionProfile = input.protectionProfile ?? preset;
  return {
    ...DEFAULT_OPTIONS,
    preset,
    protectionProfile,
    ...input,
  };
}
