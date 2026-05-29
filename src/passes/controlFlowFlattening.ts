import type { ObfuscationOptions } from "../pipeline/config.js";
import { createSeededRng, randomStateIds } from "../pipeline/random.js";
import type { ProgramNode } from "../parser/astTypes.js";
import type { ScopeInfo } from "../parser/scopeAnalyzer.js";

export interface BasicBlock {
  id: number;
  source: string;
}

export interface StateMachine {
  states: number[];
  fakeStates: number[];
}

export function flattenControlFlow(ast: ProgramNode, _scopeInfo: ScopeInfo, options: ObfuscationOptions): StateMachine {
  const rng = createSeededRng(options.seed);
  const hot = Number(ast.metadata?.hotCallbacks ?? 0);
  ast.metadata ??= {};
  ast.metadata.controlFlowFlatteningSkippedHotCallbacks = hot;
  return {
    states: randomStateIds(Math.max(1, Math.min(4, collectFunctionCount(ast))), rng),
    fakeStates: options.injectDeadCode ? randomStateIds(2, rng) : [],
  };
}

export function flattenFunctionBody<T>(functionNode: T, _options: ObfuscationOptions): T {
  return functionNode;
}

export function splitFunctionIntoBasicBlocks(functionNode: string): BasicBlock[] {
  return [{ id: 1, source: functionNode }];
}

export function createStateMachine(blocks: BasicBlock[]): StateMachine {
  return { states: blocks.map((block) => block.id), fakeStates: [] };
}

export function generateStateVariable(): string {
  return "__state";
}

export function generateStateDispatchLoop(states: number[]): string {
  return `local __state=${states[0] ?? 1};while true do if __state==${states[0] ?? 1} then break else break end end`;
}

export function randomizeStateIds(states: number[]): number[] {
  return [...states].sort(() => Math.random() - 0.5);
}

export function insertFakeStates(states: number[]): number[] {
  return [...states, 77291];
}

export function insertDeadBranches<T>(states: T): T {
  return states;
}

export function insertOpaqueTransitions<T>(states: T): T {
  return states;
}

export function reconnectBlocksWithStates<T>(blocks: T): T {
  return blocks;
}

function collectFunctionCount(ast: ProgramNode): number {
  return ast.tokens.filter((token) => token.value === "function").length;
}
