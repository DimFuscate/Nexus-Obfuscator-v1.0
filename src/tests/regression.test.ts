import { obfuscateLua } from "../pipeline/obfuscationPipeline.js";

export const ROBLOX_REGRESSION_SAMPLES = [
  `print("hello")`,
  `local x = 1 + 2\nif x > 2 then\n  print("ok")\nend`,
  `for i = 1, 10 do\n  print(i)\nend`,
  `local t = { a = 1, b = 2 }\nprint(t.a + t.b)`,
  `local function add(a, b)\n  return a + b\nend\nprint(add(2, 3))`,
  `local Players = game:GetService("Players")\nlocal LocalPlayer = Players.LocalPlayer\nprint(LocalPlayer.Name)`,
  `-- leading comment\n\nlocal gui = Instance.new("ScreenGui")\ngui.ResetOnSpawn = false\ngui.Parent = game.Players.LocalPlayer.PlayerGui`,
  `local RunService = game:GetService("RunService")\nRunService.RenderStepped:Connect(function(dt)\n  print(dt)\nend)`,
  `button.MouseButton1Click:Connect(function()\n  print("clicked")\nend)`,
  `local module = require(script.Parent.Module)\nprint(module.Value)`,
  `task.spawn(function()\n  task.wait(1)\n  print("done")\nend)`,
];

export function runRegressionSmoke(): boolean {
  for (const sample of ROBLOX_REGRESSION_SAMPLES) {
    const result = obfuscateLua(sample, { preset: "light", seed: "regression" });
    if (!result.code.includes("NexusProtect") && !result.code.includes("LPH_ENCSTR")) {
      return false;
    }
  }
  return true;
}

export function runVMSmoke(): boolean {
  const result = obfuscateLua(`print("hello")`, { preset: "enterprise", seed: "vm-smoke" });
  return !result.code.includes("\n")
    && !result.code.includes("__run")
    && !result.code.includes("elseif")
    && !result.code.includes("loadstring")
    && result.report.vmChunks >= 1
    && result.report.integrityChecksInserted >= 1;
}

export function runVMFallbackSmoke(): boolean {
  const result = obfuscateLua(`if true then\n  print("branch")\nend`, { preset: "enterprise", seed: "vm-fallback" });
  return result.report.vmUnsupportedFunctions >= 1
    && result.warnings.some((warning) => warning.includes("VM could not cover"));
}
