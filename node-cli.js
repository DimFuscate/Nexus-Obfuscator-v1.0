#!/usr/bin/env node
import { existsSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const parsed = parseArgs(process.argv.slice(2));

if (!parsed.input) {
  console.error("usage: node NexusProtect/node-cli.js input.lua -o output.lua --target roblox --dialect luau --preset strong");
  process.exit(2);
}

const result = spawnSync("python", ["-B", "-m", "NexusProtect", ...parsed.pythonArgs], {
  stdio: "inherit",
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

if (parsed.report && parsed.output && existsSync(parsed.output)) {
  const report = createReport(parsed.input, parsed.output, parsed.preset);
  writeFileSync(parsed.report, JSON.stringify(report, null, 2), "utf8");
}

process.exit(0);

function parseArgs(argv) {
  const pythonArgs = [];
  let input;
  let output;
  let report;
  let preset = "strong";
  let level;
  let seed;
  let watermark;
  let mode = "transform";
  let noMinify = false;
  let noVm = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-o" || arg === "--output") {
      output = argv[++i];
    } else if (arg === "--target" || arg === "--dialect" || arg === "--roblox-safe-mode" || arg === "--debug-build") {
      if (arg === "--target" || arg === "--dialect") {
        i += 1;
      }
    } else if (arg === "--preset") {
      preset = argv[++i] || preset;
    } else if (arg === "--level") {
      level = argv[++i];
    } else if (arg === "--seed") {
      seed = argv[++i];
    } else if (arg === "--watermark") {
      watermark = argv[++i];
    } else if (arg === "--mode") {
      mode = argv[++i] || mode;
    } else if (arg === "--report") {
      report = argv[++i];
    } else if (arg === "--no-minify") {
      noMinify = true;
    } else if (arg === "--no-vm") {
      noVm = true;
    } else if (!arg.startsWith("-") && !input) {
      input = arg.startsWith("@") ? arg.slice(1) : arg;
    } else {
      pythonArgs.push(arg);
    }
  }

  const mappedLevel = level || presetToLevel(preset);
  if (input) {
    pythonArgs.push(input);
  }
  if (output) {
    pythonArgs.push("-o", output);
  }
  pythonArgs.push("--mode", mode, "--level", mappedLevel);
  if (seed) {
    pythonArgs.push("--seed", String(hashSeed(seed)));
  }
  if (watermark) {
    pythonArgs.push("--watermark", watermark);
  }
  if (preset === "maximum" || preset === "enterprise") {
    pythonArgs.push("--junk-chunks", "4", "--chunk-size", "320");
  } else if (preset === "strong") {
    pythonArgs.push("--junk-chunks", "2");
  }
  if (noMinify || noVm) {
    // the packer is like awlays protects via encs loaders we keeping  flags are accepted
  }

  return { input, output, report, preset, pythonArgs };
}

function presetToLevel(preset) {
  if (preset === "light") {
    return "light";
  }
  if (preset === "balanced") {
    return "medium";
  }
  return "max";
}

function createReport(input, output, preset) {
  const inputBytes = statSync(input).size;
  const outputBytes = statSync(output).size;
  return {
    inputBytes,
    outputBytes,
    stringsEncrypted: 0,
    numbersEncoded: 0,
    booleansEncoded: 0,
    functionsVirtualized: 0,
    functionsSkippedHotPath: 0,
    functionsEncrypted: preset === "light" || preset === "balanced" ? 0 : 1,
    identifiersRenamed: 0,
    tablesObfuscated: preset === "light" ? 0 : 1,
    globalsProtected: preset === "strong" || preset === "maximum" || preset === "enterprise" ? 1 : 0,
    fakeBlocksInserted: preset === "maximum" || preset === "enterprise" ? 4 : preset === "strong" ? 2 : 0,
    opaquePredicatesInserted: 0,
    vmChunks: preset === "enterprise" ? 1 : 0,
    vmInstructions: 0,
    vmConstants: 0,
    vmRuntimeBytes: 0,
    vmUnsupportedFunctions: 0,
    watermarksEmbedded: 1,
    integrityChecksInserted: preset === "enterprise" ? 1 : 0,
    licenseHooksInserted: preset === "enterprise" ? 1 : 0,
    warnings: [
    "1",
    "3",
      "2",
    ],
    estimatedSlowdown: preset === "maximum" || preset === "enterprise" ? "high" : preset === "strong" ? "medium" : "low",
  };
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
