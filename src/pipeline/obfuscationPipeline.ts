import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { ObfuscationInputOptions, ObfuscationOptions, ObfuscationResult } from "./config.js";
import { DEFAULT_OPTIONS } from "./config.js";
import { PRESETS, pythonLevelForPreset } from "./presets.js";
import { addWarning, collectWarnings, createBuildReport, generateBuildReport } from "./buildReport.js";
import { hashSeed } from "./random.js";
import { normalizeLineEndings, parseSource, validateParserCoverage } from "../parser/luauParser.js";
import { analyzeScopes } from "../parser/scopeAnalyzer.js";
import { emitLua } from "../parser/sourceEmitter.js";
import { validateAfterPass, validateAST, validateOutputSyntax } from "./validator.js";
import { processMacros } from "../passes/macroProcessor.js";
import { applyRobloxCompatibilityAnnotations } from "../passes/robloxCompatibility.js";
import { encryptStrings } from "../passes/stringEncryption.js";
import { encryptNumbers } from "../passes/numberEncryption.js";
import { encodeBooleansAndNil } from "../passes/booleanNilEncoding.js";
import { obfuscateTables } from "../passes/tableObfuscation.js";
import { protectGlobals } from "../passes/globalProtection.js";
import { flattenControlFlow } from "../passes/controlFlowFlattening.js";
import { encryptFunctions } from "../passes/functionEncryption.js";
import { virtualizeSelectedFunctions } from "../vm/vmEmitter.js";
import { emitVMProgram } from "../vm/vm.js";
import { injectDeadCode } from "../passes/deadCodeInjection.js";
import { insertOpaquePredicates } from "../passes/opaquePredicates.js";
import { renameIdentifiers } from "../passes/identifierRenamer.js";
import { minifyLua } from "../passes/minifier.js";
import { runParityPasses } from "../passes/parity.js";

export function obfuscateLua(source: string, options: ObfuscationInputOptions = {}): ObfuscationResult {
  const preset = options.preset ?? DEFAULT_OPTIONS.preset;
  const resolved: ObfuscationOptions = {
    ...DEFAULT_OPTIONS,
    preset,
    ...PRESETS[preset],
    ...options,
    dialect: "luau",
    target: "roblox",
    robloxSafeMode: true,
  };
  const normalized = normalizeLineEndings(source);
  const report = createBuildReport(Buffer.byteLength(normalized, "utf8"));

  if (resolved.vmMode !== "off") {
    addWarning(report, `VM mode '${resolved.vmMode}' requested; NexusProtect will emit VM output only for currently supported AST-safe chunks and otherwise fall back safely.`);
  }
  if (resolved.encryptFunctions) {
    addWarning(report, "Whole-function encryption that requires loadstring is represented through VM/function metadata in Roblox-safe output.");
  }

  const ast = parseSource(normalized, resolved.dialect);
  validateAST(ast);
  for (const warning of validateParserCoverage(ast)) {
    addWarning(report, warning);
  }

  const scopeInfo = analyzeScopes(ast, {
    dialect: resolved.dialect,
    target: resolved.target,
  });

  const macroInfo = processMacros(ast, resolved);
  for (const warning of macroInfo.warnings) {
    addWarning(report, warning);
  }

  applyRobloxCompatibilityAnnotations(ast, scopeInfo, resolved, report);
  if (resolved.protectionProfile === "enterprise") {
    for (const result of runParityPasses(ast, resolved)) {
      for (const warning of result.warnings) {
        addWarning(report, `${result.pass}: ${warning}`);
      }
    }
    report.watermarksEmbedded += resolved.watermark ? 1 : 0;
    report.licenseHooksInserted += resolved.licenseMode === "off" ? 0 : 1;
  }

  if (resolved.encryptStrings) {
    const encrypted = encryptStrings(ast, scopeInfo, resolved);
    report.stringsEncrypted += encrypted.length;
    validateAfterPass(ast, "encryptStrings", resolved);
  }

  if (resolved.encryptNumbers) {
    const numbers = encryptNumbers(ast, scopeInfo, resolved);
    report.numbersEncoded += numbers.length;
    validateAfterPass(ast, "encryptNumbers", resolved);
  }

  if (resolved.encodeBooleans) {
    const booleans = encodeBooleansAndNil(ast, scopeInfo, resolved);
    report.booleansEncoded += booleans.length;
    validateAfterPass(ast, "encodeBooleansAndNil", resolved);
  }

  if (resolved.obfuscateTables) {
    obfuscateTables(ast, scopeInfo, resolved);
    report.tablesObfuscated += Number(ast.metadata?.tableAccessCandidates ?? 0);
    validateAfterPass(ast, "obfuscateTables", resolved);
  }

  if (resolved.protectGlobals) {
    const globals = protectGlobals(ast, scopeInfo, resolved);
    report.globalsProtected += globals.length;
    validateAfterPass(ast, "protectGlobals", resolved);
  }

  if (resolved.flattenControlFlow) {
    flattenControlFlow(ast, scopeInfo, resolved);
    report.functionsSkippedHotPath += Number(ast.metadata?.controlFlowFlatteningSkippedHotCallbacks ?? 0);
    validateAfterPass(ast, "flattenControlFlow", resolved);
  }

  if (resolved.encryptFunctions) {
    report.functionsEncrypted += encryptFunctions(ast, scopeInfo, resolved);
    validateAfterPass(ast, "encryptFunctions", resolved);
  }

  if (resolved.virtualizeFunctions) {
    const chunks = virtualizeSelectedFunctions(ast, resolved);
    report.functionsVirtualized += chunks.length;
    report.vmChunks += chunks.length;
    report.vmInstructions += chunks.reduce((count, chunk) => count + chunk.c.length, 0);
    report.vmConstants += chunks.reduce((count, chunk) => count + chunk.k.length, 0);
    validateAfterPass(ast, "virtualizeFunctions", resolved);
  }

  if (resolved.injectDeadCode) {
    report.fakeBlocksInserted += injectDeadCode(ast, scopeInfo, resolved);
    validateAfterPass(ast, "injectDeadCode", resolved);
  }

  if (resolved.insertOpaquePredicates) {
    report.opaquePredicatesInserted += insertOpaquePredicates(ast, scopeInfo, resolved);
    validateAfterPass(ast, "insertOpaquePredicates", resolved);
  }

  if (resolved.renameIdentifiers) {
    report.identifiersRenamed += renameIdentifiers(ast, scopeInfo, resolved).size;
    validateAfterPass(ast, "renameIdentifiers", resolved);
  }

  let validatedSource = emitLua(ast, resolved);
  if (resolved.minify && resolved.debugBuild) {
    validatedSource = minifyLua(validatedSource, resolved);
  }

  validateOutputSyntax(validatedSource, resolved.dialect);

  const vmResult = shouldAttemptVM(resolved) ? emitVMProgram(ast, resolved) : undefined;
  if (shouldAttemptVM(resolved) && vmResult) {
    for (const warning of vmResult.warnings) {
      addWarning(report, warning);
    }
    report.functionsVirtualized = Math.max(report.functionsVirtualized, 1);
    report.vmChunks += vmResult.chunks;
    report.vmInstructions += vmResult.instructions;
    report.vmConstants += vmResult.constants;
    report.vmRuntimeBytes += vmResult.runtimeBytes;
    report.integrityChecksInserted += vmResult.integrityChecks;
    report.outputBytes = Buffer.byteLength(vmResult.code, "utf8");
    const finalReport = generateBuildReport(report, resolved);
    return {
      code: vmResult.code,
      report: finalReport,
      warnings: collectWarnings(finalReport),
    };
  }

  if (shouldAttemptVM(resolved)) {
    report.vmUnsupportedFunctions += 1;
    addWarning(report, "VM could not cover this script yet; emitted hardened transform fallback instead of broken VM output.");
  }

  const code = runPythonProtector(validatedSource, resolved);
  validateOutputSyntax(code, "luau");
  report.outputBytes = Buffer.byteLength(code, "utf8");

  const finalReport = generateBuildReport(report, resolved);
  return {
    code,
    report: finalReport,
    warnings: collectWarnings(finalReport),
  };
}

function shouldAttemptVM(options: ObfuscationOptions): boolean {
  return options.robloxSafeMode && (options.protectionProfile === "enterprise" || options.vmMode === "full");
}

export function obfuscateLuaFile(inputPath: string, options: ObfuscationInputOptions = {}): ObfuscationResult {
  const source = readFileSync(inputPath, "utf8");
  const result = obfuscateLua(source, options);
  const output = options.output ?? inputPath.replace(/(\.lua|\.luau)?$/i, ".nexus-obf.lua");
  writeFileSync(output, result.code, "utf8");
  result.report.inputBytes = statSync(inputPath).size;
  if (options.report) {
    writeFileSync(options.report, JSON.stringify(result.report, null, 2), "utf8");
  }
  return result;
}

function runPythonProtector(source: string, options: ObfuscationOptions): string {
  const tempDir = mkdtempSync(join(tmpdir(), "nexus-protect-"));
  const input = join(tempDir, "input.lua");
  const output = join(tempDir, "output.lua");
  writeFileSync(input, source, "utf8");

  const args = [
    "-B",
    "-m",
    "NexusProtect",
    input,
    "-o",
    output,
    "--mode",
    "transform",
    "--level",
    pythonLevelForPreset(options.preset),
    "--fail-open",
  ];
  if (options.seed) {
    args.push("--seed", String(hashSeed(options.seed)));
  }
  const watermark = normalizeWatermark(options.watermark);
  if (watermark) {
    args.push("--watermark", watermark);
  }
  if (options.preset === "maximum" || options.preset === "enterprise") {
    args.push("--junk-chunks", "4", "--chunk-size", "320");
  } else if (options.preset === "strong") {
    args.push("--junk-chunks", "2", "--chunk-size", "384");
  }

  const result = spawnPython(args);
  try {
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || result.error?.message || "NexusProtect Python packer failed");
    }
    return readFileSync(output, "utf8");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function normalizeWatermark(watermark: ObfuscationOptions["watermark"]): string | undefined {
  if (!watermark) {
    return undefined;
  }
  if (typeof watermark === "string") {
    return watermark;
  }
  return [watermark.buyerId, watermark.buildId, watermark.hidden ? "hidden" : undefined].filter(Boolean).join(":") || undefined;
}

function spawnPython(args: string[]): { status: number | null; stdout: string; stderr: string; error?: Error } {
  // `python -m NexusProtect` needs the package parent on sys.path, even when Node is launched from NexusProtect/.
  const pythonCwd = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
  const spawnOptions = { cwd: pythonCwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] } as const;
  const first = spawnSync("python", args, spawnOptions);
  if (first.error && first.error.message.includes("ENOENT")) {
    return spawnSync("py", ["-3", ...args], spawnOptions);
  }
  return first;
}
