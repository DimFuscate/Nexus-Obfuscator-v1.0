const $ = (id) => document.getElementById(id);

const ui = {
  sourceFile: $("sourceFile"),
  sourceInput: $("sourceInput"),
  outputCode: $("outputCode"),
  seedInput: $("seedInput"),
  randomSeedButton: $("randomSeedButton"),
  obfuscateButton: $("obfuscateButton"),
  copyButton: $("copyButton"),
  downloadButton: $("downloadButton"),
  statusBox: $("statusBox"),
  metrics: $("metrics"),
  healthStatus: $("healthStatus"),
};

let selectedFileName = "script.lua";
let outputFileName = "obfuscated.lua";

const bytes = (value) => new TextEncoder().encode(value || "").length;
const size = (value) => {
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

function status(message, mode = "") {
  ui.statusBox.textContent = message;
  ui.statusBox.dataset.mode = mode;
}

function randomSeed() {
  const data = crypto.getRandomValues(new Uint32Array(4));
  ui.seedInput.value = Array.from(data, (value) => value.toString(36)).join("-");
}

function config(source) {
  return {
    preset: "enterprise",
    protectionProfile: "enterprise",
    vmMode: "full",
    stringMode: "no-cache",
    deadCodeDensity: "high",
    integrityPolicy: "controlled-error",
    licenseMode: "signed-response",
    seed: ui.seedInput.value.trim() || undefined,
    watermark: "nexus",
    minify: true,
    debugBuild: false,
    source,
    fileName: selectedFileName,
  };
}

async function loadFile(file) {
  if (!file) return;
  selectedFileName = file.name || "script.lua";
  ui.sourceInput.value = await file.text();
  status(`${selectedFileName} loaded`, "ok");
  updateMetrics();
}

function updateMetrics() {
  ui.metrics.textContent = `${size(bytes(ui.sourceInput.value))} -> ${size(bytes(ui.outputCode.value))}`;
}

async function obfuscate() {
  const source = ui.sourceInput.value;
  if (!source.trim()) {
    status("Paste or upload source first", "error");
    return;
  }

  ui.obfuscateButton.disabled = true;
  ui.outputCode.value = "";
  status("Building...");
  updateMetrics();

  try {
    const started = performance.now();
    const response = await fetch("/api/obfuscate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config(source)),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Build failed");

    ui.outputCode.value = payload.code || "";
    outputFileName = payload.fileName || "obfuscated.lua";
    const elapsed = Math.round(payload.elapsedMs || performance.now() - started);
    ui.metrics.textContent = `${size(payload.report?.inputBytes || bytes(source))} -> ${size(payload.report?.outputBytes || bytes(ui.outputCode.value))} / ${elapsed} ms`;
    status("Done", "ok");
  } catch (error) {
    status(error instanceof Error ? error.message : "Build failed", "error");
  } finally {
    ui.obfuscateButton.disabled = false;
  }
}

async function copyOutput() {
  if (!ui.outputCode.value) {
    status("No output", "error");
    return;
  }
  await navigator.clipboard.writeText(ui.outputCode.value);
  status("Copied", "ok");
}

function downloadOutput() {
  if (!ui.outputCode.value) {
    status("No output", "error");
    return;
  }
  const blob = new Blob([ui.outputCode.value], { type: "text/x-lua" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = outputFileName;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
  status("Downloaded", "ok");
}

ui.randomSeedButton.addEventListener("click", randomSeed);
ui.obfuscateButton.addEventListener("click", () => void obfuscate());
ui.copyButton.addEventListener("click", () => void copyOutput());
ui.downloadButton.addEventListener("click", downloadOutput);
ui.sourceInput.addEventListener("input", updateMetrics);
ui.sourceFile.addEventListener("change", () => void loadFile(ui.sourceFile.files?.[0]));

fetch("/api/health")
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then(() => {
    ui.healthStatus.textContent = "Online";
  })
  .catch(() => {
    ui.healthStatus.textContent = "Offline";
  });

randomSeed();
updateMetrics();
