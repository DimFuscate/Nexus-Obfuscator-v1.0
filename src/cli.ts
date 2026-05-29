#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { obfuscateLuaFile } from "./pipeline/obfuscationPipeline.js";
import type { ObfuscationInputOptions, ObfuscationPreset } from "./pipeline/config.js";

const args = process.argv.slice(2);
const parsed = parseArgs(args);
const optionError = enforceRobloxOnly(parsed.options);

if (!parsed.input) {
  console.error("usage: node dist/cli.js input.lua -o output.lua --target roblox --dialect luau --preset enterprise");
  process.exit(2);
}
if (optionError) {
  console.error(optionError);
  process.exit(2);
}

try {
  const result = obfuscateLuaFile(parsed.input, parsed.options);
  if (parsed.options.report) {
    writeFileSync(parsed.options.report, JSON.stringify(result.report, null, 2), "utf8");
  }
  console.log("NexusProtect build complete");
  console.log(`  Input:  ${parsed.input}`);
  console.log(`  Output: ${parsed.options.output ?? parsed.input.replace(/(\\.lua|\\.luau)?$/i, ".nexus-pack.lua")}`);
  console.log(`  Preset: ${parsed.options.preset ?? "strong"}`);
  console.log(`  Size:   ${result.report.outputBytes.toLocaleString()} bytes`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseArgs(argv: string[]): { input?: string; options: ObfuscationInputOptions } {
  const options: ObfuscationInputOptions = {};
  let input: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-o" || arg === "--output") {
      options.output = argv[++i];
    } else if (arg === "--target") {
      options.target = argv[++i] as ObfuscationInputOptions["target"];
    } else if (arg === "--dialect") {
      options.dialect = argv[++i] as ObfuscationInputOptions["dialect"];
    } else if (arg === "--preset") {
      options.preset = argv[++i] as ObfuscationPreset;
    } else if (arg === "--seed") {
      options.seed = argv[++i];
    } else if (arg === "--report") {
      options.report = argv[++i];
    } else if (arg === "--debug-build") {
      options.debugBuild = true;
    } else if (arg === "--no-minify") {
      options.minify = false;
    } else if (arg === "--no-vm") {
      options.virtualizeFunctions = false;
      options.vmMode = "off";
    } else if (arg === "--vm-mode") {
      options.vmMode = argv[++i] as ObfuscationInputOptions["vmMode"];
    } else if (arg === "--profile" || arg === "--protection-profile") {
      options.protectionProfile = argv[++i] as ObfuscationPreset;
    } else if (arg === "--string-mode") {
      options.stringMode = argv[++i] as ObfuscationInputOptions["stringMode"];
    } else if (arg === "--dead-code-density") {
      options.deadCodeDensity = argv[++i] as ObfuscationInputOptions["deadCodeDensity"];
    } else if (arg === "--integrity-policy") {
      options.integrityPolicy = argv[++i] as ObfuscationInputOptions["integrityPolicy"];
    } else if (arg === "--license-mode") {
      options.licenseMode = argv[++i] as ObfuscationInputOptions["licenseMode"];
    } else if (arg === "--roblox-safe-mode") {
      options.robloxSafeMode = true;
    } else if (!arg.startsWith("-") && !input) {
      input = arg.startsWith("@") ? arg.slice(1) : arg;
    }
  }
  return { input, options };
}

function enforceRobloxOnly(options: ObfuscationInputOptions): string | undefined {
  if (options.target && options.target !== "roblox") {
    return "NexusProtect only supports --target roblox.";
  }
  if (options.dialect && options.dialect !== "luau") {
    return "NexusProtect only supports --dialect luau.";
  }
  options.target = "roblox";
  options.dialect = "luau";
  options.robloxSafeMode = true;
  return undefined;
}
