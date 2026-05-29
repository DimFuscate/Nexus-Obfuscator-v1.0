import type { ObfuscationOptions } from "../pipeline/config.js";
import type { BuildReport } from "../pipeline/config.js";
import { addWarning } from "../pipeline/buildReport.js";
import type { ProgramNode } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export const ROBLOX_PROTECTED_GLOBALS = new Set([
  "game",
  "workspace",
  "script",
  "shared",
  "_G",
  "Enum",
  "Instance",
  "Vector2",
  "Vector3",
  "Vector2int16",
  "Vector3int16",
  "CFrame",
  "Color3",
  "UDim",
  "UDim2",
  "BrickColor",
  "NumberRange",
  "NumberSequence",
  "ColorSequence",
  "Ray",
  "Region3",
  "Region3int16",
  "Rect",
  "Random",
  "DateTime",
  "PhysicalProperties",
  "TweenInfo",
  "RaycastParams",
  "OverlapParams",
  "task",
  "coroutine",
  "string",
  "table",
  "math",
  "bit32",
  "utf8",
  "buffer",
  "debug",
  "os",
  "pcall",
  "xpcall",
  "require",
  "loadstring",
  "getfenv",
  "setfenv",
  "print",
  "warn",
  "error",
  "assert",
  "pairs",
  "ipairs",
  "next",
  "tonumber",
  "tostring",
  "type",
  "typeof",
  "select",
  "unpack",
  "rawget",
  "rawset",
  "rawequal",
  "rawlen",
  "setmetatable",
  "getmetatable",
  "collectgarbage",
  "tick",
  "time",
  "wait",
  "spawn",
  "delay",
  "plugin",
]);

export const ROBLOX_PROTECTED_MEMBERS = new Set([
  "GetService",
  "WaitForChild",
  "FindFirstChild",
  "FindFirstChildOfClass",
  "FindFirstChildWhichIsA",
  "FindFirstAncestor",
  "FindFirstAncestorOfClass",
  "FindFirstAncestorWhichIsA",
  "GetChildren",
  "GetDescendants",
  "IsA",
  "IsDescendantOf",
  "IsAncestorOf",
  "Clone",
  "Destroy",
  "Remove",
  "Connect",
  "Once",
  "Disconnect",
  "Wait",
  "FireServer",
  "FireClient",
  "FireAllClients",
  "InvokeServer",
  "InvokeClient",
  "Fire",
  "Invoke",
  "SetAttribute",
  "GetAttribute",
  "GetAttributes",
  "SetAttributes",
  "GetPropertyChangedSignal",
  "GetDebugId",
  "AddTag",
  "RemoveTag",
  "HasTag",
  "GetTags",
  "MouseButton1Click",
  "MouseButton1Down",
  "MouseButton1Up",
  "MouseButton2Click",
  "MouseButton2Down",
  "MouseButton2Up",
  "InputBegan",
  "InputEnded",
  "InputChanged",
  "RenderStepped",
  "Heartbeat",
  "Stepped",
  "Touched",
  "TouchEnded",
  "Changed",
  "ChildAdded",
  "ChildRemoved",
  "DescendantAdded",
  "DescendantRemoving",
  "AncestryChanged",
  "AttributeChanged",
]);

export function applyRobloxCompatibilityAnnotations(
  ast: ProgramNode,
  _scopeInfo: ScopeInfo,
  options: ObfuscationOptions,
  report?: BuildReport,
): void {
  ast.metadata ??= {};
  ast.metadata.robloxSafeMode = options.target === "roblox" && options.robloxSafeMode;
  ast.metadata.hotCallbacks = detectRenderLoops(ast);
  if (options.target !== "roblox" && report) {
    addWarning(report, "Roblox safe-mode annotations skipped because target is generic.");
  }
}

export function enableLuauMode(options: ObfuscationOptions): ObfuscationOptions {
  return { ...options, dialect: "luau", target: "roblox", robloxSafeMode: true };
}

export function parseLuauTypes(source: string): string {
  return source;
}

export function preserveLuauTypeAnnotations(ast: ProgramNode): ProgramNode {
  return ast;
}

export function handleLuauCompoundAssignments(ast: ProgramNode): ProgramNode {
  return ast;
}

export function handleLuauContinue(ast: ProgramNode): ProgramNode {
  return ast;
}

export function protectRobloxServices(ast: ProgramNode): ProgramNode {
  return ast;
}

export function optimizeRobloxEventCallbacks(ast: ProgramNode): ProgramNode {
  return ast;
}

export function avoidVirtualizingRenderLoops(ast: ProgramNode): ProgramNode {
  ast.metadata ??= {};
  ast.metadata.hotCallbacks = detectRenderLoops(ast);
  return ast;
}

export function avoidVirtualizingHeartbeatLoops(ast: ProgramNode): ProgramNode {
  return avoidVirtualizingRenderLoops(ast);
}

export function supportTeleportQueueCompatibility(ast: ProgramNode): ProgramNode {
  return ast;
}

export function supportGameGetServicePatterns(ast: ProgramNode): ProgramNode {
  return ast;
}

export function detectRenderLoops(ast: ProgramNode): number {
  let count = 0;
  for (let i = 0; i < ast.tokens.length; i += 1) {
    if (["RenderStepped", "Heartbeat", "Stepped"].includes(ast.tokens[i].value)) {
      count += 1;
    }
  }
  return count;
}
