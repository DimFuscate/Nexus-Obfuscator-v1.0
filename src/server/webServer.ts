import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { obfuscateLua } from "../pipeline/obfuscationPipeline.js";
import type { ObfuscationInputOptions, ObfuscationPreset } from "../pipeline/config.js";
import { renderReactApp } from "./reactApp.js";

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const webRoot = join(projectRoot, "web");
const maxSourceBytes = 2 * 1024 * 1024;
const presets = new Set<ObfuscationPreset>(["light", "balanced", "strong", "maximum", "enterprise"]);
const defaultPort = 8787;
const maxPortAttempts = 20;

interface ObfuscateRequest {
  source?: unknown;
  fileName?: unknown;
  preset?: unknown;
  seed?: unknown;
  watermark?: unknown;
  debugBuild?: unknown;
  minify?: unknown;
  vmMode?: unknown;
  protectionProfile?: unknown;
  stringMode?: unknown;
  deadCodeDensity?: unknown;
  integrityPolicy?: unknown;
  licenseMode?: unknown;
}

type ListenError = Error & {
  code?: string;
};

export function startWebServer(port = Number(process.env.NEXUS_PROTECT_PORT || defaultPort), host = "127.0.0.1"): void {
  const initialPort = normalizePort(port, defaultPort);
  listenWithFallback(initialPort, host, 0);
}

function createWebServer() {
  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unexpected server error",
      });
    }
  });
}

function listenWithFallback(port: number, host: string, attempt: number): void {
  const server = createWebServer();

  server.once("error", (error: ListenError) => {
    if (error.code === "EADDRINUSE" && attempt < maxPortAttempts) {
      const nextPort = port + 1;
      console.warn(`Port ${host}:${port} is in use, trying http://${host}:${nextPort}`);
      listenWithFallback(nextPort, host, attempt + 1);
      return;
    }

    console.error(`NexusProtect web UI failed to start on ${host}:${port}: ${error.message}`);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`NexusProtect web UI running at http://${host}:${port}`);
  });
}

function normalizePort(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const port = Math.trunc(value);
  if (port < 0 || port > 65535) return fallback;
  return port;
}

async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://local.nexus");

  if (method === "OPTIONS") {
    sendNoContent(response);
    return;
  }

  if (method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, target: "roblox", dialect: "luau" });
    return;
  }

  if (method === "POST" && url.pathname === "/api/obfuscate") {
    await handleObfuscate(request, response);
    return;
  }

  if (method === "GET") {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      sendHtml(response, renderReactApp());
      return;
    }
    serveStatic(url.pathname, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function handleObfuscate(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readBody(request, maxSourceBytes + 16_384);
  let payload: ObfuscateRequest;
  try {
    payload = JSON.parse(body) as ObfuscateRequest;
  } catch {
    sendJson(response, 400, { error: "Invalid JSON body" });
    return;
  }

  if (typeof payload.source !== "string" || payload.source.trim().length === 0) {
    sendJson(response, 400, { error: "Lua source is required" });
    return;
  }
  if (Buffer.byteLength(payload.source, "utf8") > maxSourceBytes) {
    sendJson(response, 413, { error: "Source is larger than 2 MB" });
    return;
  }

  const preset = typeof payload.preset === "string" && presets.has(payload.preset as ObfuscationPreset)
    ? payload.preset as ObfuscationPreset
    : "maximum";

  const options: ObfuscationInputOptions = {
    dialect: "luau",
    target: "roblox",
    preset,
    robloxSafeMode: true,
    seed: typeof payload.seed === "string" && payload.seed.trim() ? payload.seed.trim() : undefined,
    watermark: typeof payload.watermark === "string" && payload.watermark.trim() ? payload.watermark.trim() : "nexus",
    debugBuild: payload.debugBuild === true,
    minify: payload.minify !== false,
    vmMode: typeof payload.vmMode === "string" && ["off", "selected", "full"].includes(payload.vmMode) ? payload.vmMode as ObfuscationInputOptions["vmMode"] : undefined,
    protectionProfile: typeof payload.protectionProfile === "string" && presets.has(payload.protectionProfile as ObfuscationPreset) ? payload.protectionProfile as ObfuscationPreset : preset,
    stringMode: typeof payload.stringMode === "string" && ["cached", "lazy", "no-cache"].includes(payload.stringMode) ? payload.stringMode as ObfuscationInputOptions["stringMode"] : undefined,
    deadCodeDensity: typeof payload.deadCodeDensity === "string" && ["off", "low", "medium", "high"].includes(payload.deadCodeDensity) ? payload.deadCodeDensity as ObfuscationInputOptions["deadCodeDensity"] : undefined,
    integrityPolicy: typeof payload.integrityPolicy === "string" && ["silent", "fake-success", "controlled-error"].includes(payload.integrityPolicy) ? payload.integrityPolicy as ObfuscationInputOptions["integrityPolicy"] : undefined,
    licenseMode: typeof payload.licenseMode === "string" && ["off", "client-hook", "signed-response"].includes(payload.licenseMode) ? payload.licenseMode as ObfuscationInputOptions["licenseMode"] : undefined,
  };

  const startedAt = Date.now();
  const result = obfuscateLua(payload.source, options);
  const baseName = sanitizeBaseName(typeof payload.fileName === "string" ? payload.fileName : "script.lua");
  sendJson(response, 200, {
    code: result.code,
    report: result.report,
    warnings: result.warnings,
    fileName: `${baseName}.obf.lua`,
    elapsedMs: Date.now() - startedAt,
  });
}

function serveStatic(pathname: string, response: ServerResponse): void {
  const route = pathname;
  const allowed: Record<string, string> = {
    "/styles.css": "text/css; charset=utf-8",
    "/app.js": "text/javascript; charset=utf-8",
  };
  const contentType = allowed[route];
  if (!contentType) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const path = join(webRoot, route.slice(1));
  if (!existsSync(path)) {
    sendJson(response, 404, { error: "Static asset missing" });
    return;
  }

  response.writeHead(200, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  response.end(readFileSync(path, "utf8"));
}

function sendHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(html);
}

function readBody(request: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString();
      if (Buffer.byteLength(body, "utf8") > limit) {
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function sendNoContent(response: ServerResponse): void {
  response.writeHead(204, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end();
}

function sanitizeBaseName(fileName: string): string {
  const withoutPath = fileName.replace(/\\/g, "/").split("/").pop() || "script.lua";
  return withoutPath.replace(/\.(lua|luau)$/i, "").replace(/[^A-Za-z0-9._-]/g, "_") || "script";
}

if (process.argv[1]?.endsWith("webServer.js")) {
  startWebServer();
}
