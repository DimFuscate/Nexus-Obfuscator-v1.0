export type {
  BuildReport,
  LuaDialect,
  ObfuscationInputOptions,
  ObfuscationOptions,
  ObfuscationPreset,
  ObfuscationResult,
  ObfuscationTarget,
} from "./pipeline/config.js";

export { DEFAULT_OPTIONS, resolveOptions } from "./pipeline/config.js";
export { PRESETS, applyPreset, pythonLevelForPreset } from "./pipeline/presets.js";
export { obfuscateLua, obfuscateLuaFile } from "./pipeline/obfuscationPipeline.js";

export * from "./parser/astTypes.js";
export * from "./parser/luauParser.js";
export * from "./parser/astWalker.js";
export * from "./parser/astCloner.js";
export * from "./parser/sourceEmitter.js";
export * from "./parser/scopeAnalyzer.js";
export * from "./compiler/index.js";
export * from "./enums.js";
export * from "./nameGenerators.js";
export * from "./randomLiterals.js";
export * from "./visitAst.js";

export * from "./pipeline/buildReport.js";
export * from "./pipeline/random.js";
export * from "./pipeline/validator.js";
export {
  addPerformanceControls,
  applyNoVirtualizeMacros,
  benchmarkObfuscated,
  benchmarkOriginal,
  detectHotLoops,
  detectRenderLoops as detectPerformanceRenderLoops,
  estimateRuntimeCost,
  generatePerformanceReport,
  setProtectionPreset,
  skipHotFunctions,
} from "./pipeline/performance.js";
export * from "./pipeline/compatibility.js";

export * from "./passes/macroProcessor.js";
export * from "./passes/robloxCompatibility.js";
export * from "./passes/identifierRenamer.js";
export * from "./passes/stringEncryption.js";
export * from "./passes/numberEncryption.js";
export * from "./passes/booleanNilEncoding.js";
export {
  generateFakeMetatable,
  generateMetatableProxy,
  hideConfigTables,
  hideConstantTables,
  obfuscateIndexAccess,
  obfuscateNewIndexAccess,
  obfuscateTables,
  replaceDotAccessWithComputedAccess,
  shuffleTableLiterals,
  wrapTableWithProxy,
} from "./passes/tableObfuscation.js";
export * from "./passes/globalProtection.js";
export * from "./passes/controlFlowFlattening.js";
export * from "./passes/functionEncryption.js";
export * from "./passes/deadCodeInjection.js";
export * from "./passes/opaquePredicates.js";
export * from "./passes/minifier.js";
export * from "./passes/watermarking.js";
export * from "./passes/errorHiding.js";
export * from "./passes/parity.js";

export { runtimeXorFallbackLua } from "./runtime/decryptors.js";
export * from "./runtime/integrity.js";
export * from "./runtime/environment.js";
export * from "./runtime/helpers.js";
export * from "./runtime/licensing.js";
export * from "./runtime/dynamicCode.js";

export * from "./vm/ir.js";
export * from "./vm/irCompiler.js";
export * from "./vm/bytecode.js";
export * from "./vm/opcodeSpec.js";
export * from "./vm/opcodeRandomizer.js";
export * from "./vm/bytecodeEncryptor.js";
export * from "./vm/superOperators.js";
export * from "./vm/vmEmitter.js";
export * from "./vm/vmRuntimeTemplate.js";
export * from "./vm/vm.js";
