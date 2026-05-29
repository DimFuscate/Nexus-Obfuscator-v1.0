import type { BuildReport, ObfuscationOptions } from "./config.js";

export function createBuildReport(inputBytes = 0): BuildReport {
  return {
    inputBytes,
    outputBytes: 0,
    stringsEncrypted: 0,
    numbersEncoded: 0,
    booleansEncoded: 0,
    functionsVirtualized: 0,
    functionsSkippedHotPath: 0,
    functionsEncrypted: 0,
    identifiersRenamed: 0,
    tablesObfuscated: 0,
    globalsProtected: 0,
    fakeBlocksInserted: 0,
    opaquePredicatesInserted: 0,
    vmChunks: 0,
    vmInstructions: 0,
    vmConstants: 0,
    vmRuntimeBytes: 0,
    vmUnsupportedFunctions: 0,
    watermarksEmbedded: 0,
    integrityChecksInserted: 0,
    licenseHooksInserted: 0,
    warnings: [],
    estimatedSlowdown: "unknown",
  };
}

export function addWarning(report: BuildReport, warning: string): void {
  if (!report.warnings.includes(warning)) {
    report.warnings.push(warning);
  }
}

export function collectWarnings(report: BuildReport): string[] {
  return [...report.warnings];
}

export function generateBuildReport(report: BuildReport, options: ObfuscationOptions): BuildReport {
  report.estimatedSlowdown = estimateSlowdown(options);
  return report;
}

export function estimateSlowdown(options: ObfuscationOptions): string {
  if (options.protectionProfile === "enterprise" || options.vmMode === "full" || options.virtualizeFunctions === true || options.superOperators) {
    return "high";
  }
  if (options.vmMode === "selected" || options.virtualizeFunctions || options.encryptFunctions || options.flattenControlFlow) {
    return "medium";
  }
  return "low";
}

export function mergeReport(target: BuildReport, source: Partial<BuildReport>): BuildReport {
  for (const key of Object.keys(source) as Array<keyof BuildReport>) {
    if (key === "warnings") {
      for (const warning of source.warnings ?? []) {
        addWarning(target, warning);
      }
      continue;
    }

    const value = source[key];
    if (typeof value === "number" && typeof target[key] === "number") {
      (target[key] as number) += value;
    } else if (typeof value === "string") {
      (target[key] as string) = value;
    }
  }
  return target;
    }
      
