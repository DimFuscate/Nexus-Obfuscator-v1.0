import type { CallExpressionNode, CallStatementNode, ExpressionNode, ProgramNode, StatementNode } from "../parser/astTypes.js";
import type { ObfuscationOptions } from "../pipeline/config.js";
import { createSeededRng, hashSeed, randomIdentifier, type SeededRng } from "../pipeline/random.js";
import { minifyLua } from "../passes/minifier.js";
import type { VMInstruction } from "./bytecode.js";
import { randomizeOpcodeMap } from "./opcodeRandomizer.js";
import type { OpcodeSpec } from "./opcodeSpec.js";
import { generateVMInterpreter, type VMRuntimeNames } from "./vmRuntimeTemplate.js";

export interface VMEmitResult {
  code: string;
  chunks: number;
  instructions: number;
  constants: number;
  runtimeBytes: number;
  integrityChecks: number;
  unsupportedFunctions: number;
  warnings: string[];
}

interface MutableChunk {
  c: VMInstruction[];
  k: unknown[];
}

interface CompileState {
  spec: OpcodeSpec;
  chunk: MutableChunk;
  nextRegister: number;
  locals: Map<string, number>;
  warnings: string[];
}

export function emitVMProgram(ast: ProgramNode, options: ObfuscationOptions): VMEmitResult | undefined {
  const rng = createSeededRng(`${options.seed ?? "nexus"}:vm`);
  const spec = randomizeOpcodeMap(rng.fork("opcodes"));
  const state: CompileState = {
    spec,
    chunk: { c: [], k: [] },
    nextRegister: 1,
    locals: new Map(),
    warnings: [],
  };

  for (const statement of ast.body) {
    if (!compileStatement(statement, state)) {
      state.warnings.push(`VM fallback: unsupported ${statement.kind}`);
      return undefined;
    }
  }

  state.chunk.c.push({ op: spec.map.RETURN, a: 1, b: 0 });
  const names = createRuntimeNames(rng.fork("names"));
  const runtime = generateVMInterpreter(spec, names);
  const payload = renderEncryptedChunk(state.chunk, options, names, rng.fork("payload"));
  const code = minifyLua(`return(function(...)\n${runtime}\n${payload}\nreturn ${names.run}(${names.chunk},...)\nend)(...)\n`, options);
  return {
    code,
    chunks: 1,
    instructions: state.chunk.c.length,
    constants: state.chunk.k.length,
    runtimeBytes: Buffer.byteLength(runtime, "utf8"),
    integrityChecks: options.integrityPolicy === "silent" ? 0 : 1,
    unsupportedFunctions: 0,
    warnings: state.warnings,
  };
}

function compileStatement(statement: StatementNode, state: CompileState): boolean {
  if (statement.kind === "CallStatement") {
    compileCall(statement, state);
    return true;
  }
  if (statement.kind === "LocalDeclaration") {
    for (let index = 0; index < statement.names.length; index += 1) {
      const register = state.nextRegister;
      state.locals.set(statement.names[index], register);
      if (statement.values[index]) {
        compileExpression(statement.values[index], register, state);
      } else {
        state.chunk.c.push({ op: state.spec.map.LOADK, a: register, b: addConstant(state.chunk, null) });
      }
      state.nextRegister += 1;
    }
    return true;
  }
  if (statement.kind === "AssignmentStatement") {
    for (let index = 0; index < statement.targets.length; index += 1) {
      const register = state.locals.get(statement.targets[index]);
      if (register) {
        compileExpression(statement.values[index] ?? { kind: "NilLiteral", raw: "nil", value: null }, register, state);
      } else {
        const valueRegister = state.nextRegister;
        compileExpression(statement.values[index] ?? { kind: "NilLiteral", raw: "nil", value: null }, valueRegister, state);
        state.chunk.c.push({ op: state.spec.map.SETGLOBAL, a: valueRegister, b: addConstant(state.chunk, statement.targets[index]) });
        state.nextRegister += 1;
      }
    }
    return true;
  }
  if (statement.kind === "IfStatement") {
    const conditionRegister = state.nextRegister;
    compileExpression(statement.condition, conditionRegister, state);
    const testIndex = state.chunk.c.length;
    state.chunk.c.push({ op: state.spec.map.TEST, a: conditionRegister, b: 0 });
    for (const inner of statement.thenBody) {
      if (!compileStatement(inner, state)) return false;
    }
    if (statement.elseBody.length > 0) {
      const jumpIndex = state.chunk.c.length;
      state.chunk.c.push({ op: state.spec.map.JMP, a: 0 });
      state.chunk.c[testIndex].b = state.chunk.c.length + 1;
      for (const inner of statement.elseBody) {
        if (!compileStatement(inner, state)) return false;
      }
      state.chunk.c[jumpIndex].a = state.chunk.c.length + 1;
    } else {
      state.chunk.c[testIndex].b = state.chunk.c.length + 1;
    }
    return true;
  }
  if (statement.kind === "WhileStatement") {
    const loopStart = state.chunk.c.length + 1;
    const conditionRegister = state.nextRegister;
    compileExpression(statement.condition, conditionRegister, state);
    const testIndex = state.chunk.c.length;
    state.chunk.c.push({ op: state.spec.map.TEST, a: conditionRegister, b: 0 });
    for (const inner of statement.body) {
      if (!compileStatement(inner, state)) return false;
    }
    state.chunk.c.push({ op: state.spec.map.JMP, a: loopStart });
    state.chunk.c[testIndex].b = state.chunk.c.length + 1;
    return true;
  }
  if (statement.kind === "ReturnStatement") {
    const start = state.nextRegister;
    for (const expression of statement.values) {
      compileExpression(expression, state.nextRegister, state);
      state.nextRegister += 1;
    }
    state.chunk.c.push({ op: state.spec.map.RETURN, a: start, b: statement.values.length });
    return true;
  }
  return false;
}

function compileCall(statement: CallStatementNode, state: CompileState): void {
  const base = state.nextRegister;
  state.chunk.c.push({ op: state.spec.map.GETGLOBAL, a: base, b: addConstant(state.chunk, statement.callee) });
  let argOffset = 1;

  if (statement.method) {
    const methodReg = base + 1;
    const selfReg = base + 2;
    state.chunk.c.push({ op: state.spec.map.GETTABLE, a: methodReg, b: base, c: addConstant(state.chunk, statement.method) });
    state.chunk.c.push({ op: state.spec.map.MOVE, a: selfReg, b: base });
    state.chunk.c.push({ op: state.spec.map.MOVE, a: base, b: methodReg });
    argOffset = 2;
  }

  for (let index = 0; index < statement.arguments.length; index += 1) {
    compileExpression(statement.arguments[index], base + argOffset + index, state);
  }
  state.chunk.c.push({ op: state.spec.map.CALL, a: base, b: statement.arguments.length + argOffset - 1, c: 0 });
  state.nextRegister = base + statement.arguments.length + argOffset + 1;
}

function compileExpression(expression: ExpressionNode, register: number, state: CompileState): void {
  if (expression.kind === "IdentifierExpression") {
    const localRegister = state.locals.get(expression.name);
    if (localRegister) {
      state.chunk.c.push({ op: state.spec.map.MOVE, a: register, b: localRegister });
      return;
    }
    state.chunk.c.push({ op: state.spec.map.GETGLOBAL, a: register, b: addConstant(state.chunk, expression.name) });
    return;
  }
  if (expression.kind === "BinaryExpression") {
    compileExpression(expression.left, register, state);
    compileExpression(expression.right, register + 1, state);
    const op = binaryOpcode(expression.operator, state.spec);
    if (op === undefined) {
      state.warnings.push(`VM lowered unsupported binary operator as nil: ${expression.operator}`);
      state.chunk.c.push({ op: state.spec.map.LOADK, a: register, b: addConstant(state.chunk, null) });
      return;
    }
    state.chunk.c.push({ op, a: register, b: register, c: register + 1 });
    return;
  }
  if (expression.kind === "MemberExpression") {
    compileExpression(expression.object, register, state);
    state.chunk.c.push({ op: state.spec.map.GETTABLE, a: register, b: register, c: addConstant(state.chunk, expression.property) });
    return;
  }
  if (expression.kind === "TableConstructorExpression") {
    state.chunk.c.push({ op: state.spec.map.NEWTABLE, a: register });
    expression.fields.forEach((field, index) => {
      const valueRegister = register + 1;
      compileExpression(field.value, valueRegister, state);
      const key = typeof field.key === "string" ? field.key : field.key ? `_${index + 1}` : index + 1;
      state.chunk.c.push({ op: state.spec.map.SETTABLE, a: register, b: addConstant(state.chunk, key), c: valueRegister });
    });
    return;
  }
  if (expression.kind === "CallExpression") {
    compileCallExpression(expression, register, state);
    return;
  }
  if (expression.kind === "StringLiteral" || expression.kind === "NumericLiteral" || expression.kind === "BooleanLiteral" || expression.kind === "NilLiteral") {
    state.chunk.c.push({ op: state.spec.map.LOADK, a: register, b: addConstant(state.chunk, expression.value) });
    return;
  }
  state.warnings.push(`VM lowered unsupported expression as nil: ${expression.kind}`);
  state.chunk.c.push({ op: state.spec.map.LOADK, a: register, b: addConstant(state.chunk, null) });
}

function compileCallExpression(expression: CallExpressionNode, register: number, state: CompileState): void {
  compileExpression(expression.callee, register, state);
  let argOffset = 1;
  if (expression.method) {
    const methodRegister = register + 1;
    const selfRegister = register + 2;
    state.chunk.c.push({ op: state.spec.map.GETTABLE, a: methodRegister, b: register, c: addConstant(state.chunk, expression.method) });
    state.chunk.c.push({ op: state.spec.map.MOVE, a: selfRegister, b: register });
    state.chunk.c.push({ op: state.spec.map.MOVE, a: register, b: methodRegister });
    argOffset = 2;
  }
  expression.arguments.forEach((argument, index) => {
    compileExpression(argument, register + argOffset + index, state);
  });
  state.chunk.c.push({ op: state.spec.map.CALL, a: register, b: expression.arguments.length + argOffset - 1, c: 1 });
}

function binaryOpcode(operator: string, spec: OpcodeSpec): number | undefined {
  const map: Record<string, number> = {
    "+": spec.map.ADD,
    "-": spec.map.SUB,
    "*": spec.map.MUL,
    "/": spec.map.DIV,
    "%": spec.map.MOD,
    "^": spec.map.POW,
    "..": spec.map.CONCAT,
    "==": spec.map.EQ,
    "<": spec.map.LT,
    "<=": spec.map.LE,
  };
  return map[operator];
}

function addConstant(chunk: MutableChunk, value: unknown): number {
  const existing = chunk.k.findIndex((constant) => Object.is(constant, value));
  if (existing !== -1) {
    return existing + 1;
  }
  chunk.k.push(value);
  return chunk.k.length;
}

function renderEncryptedChunk(chunk: MutableChunk, options: ObfuscationOptions, runtimeNames: VMRuntimeNames, rng: SeededRng): string {
  const names = createPayloadNames(rng.fork("names"));
  const padded = addFakeInstructions(chunk.c, rng);
  const key = hashSeed(`${options.seed ?? "nexus"}:${padded.length}:${chunk.k.length}:${rng.int(1, 0x7fffffff)}`) || 1;
  const stride = rng.int(41, 233);
  const mod = 8191;
  const flat: number[] = [];
  for (const instruction of padded) {
    flat.push(instruction.op, instruction.a ?? 0, instruction.b ?? 0, instruction.c ?? 0);
  }
  const encrypted = flat.map((value, index) => (value + ((key + (index + 1) * stride) % mod)) % mod);
  const checksum = encrypted.reduce((sum, value, index) => (sum + value * (index + 5)) % 2147483647, 0);
  const constants = chunk.k.map((constant) => renderConstant(constant, key, rng)).join(",");
  const failure = options.integrityPolicy === "silent"
    ? "return nil"
  : options.integrityPolicy === "fake-success"
      ? "return true"
      : "error('',0)";
  return `local ${names.key}=${key};local ${names.raw}={${encrypted.join(",")}};local function ${names.check}(t)local s=0;for i=1,#t do s=(s+t[i]*(i+4))%2147483647 end;return s end;if ${names.check}(${names.raw})~=${checksum} then ${failure} end;local ${names.code}={};for i=1,#${names.raw},4 do local n=(i-1)/4+1;${names.code}[n]={((${names.raw}[i]-((${names.key}+i*${stride})%${mod}))%${mod}),((${names.raw}[i+1]-((${names.key}+(i+1)*${stride})%${mod}))%${mod}),((${names.raw}[i+2]-((${names.key}+(i+2)*${stride})%${mod}))%${mod}),((${names.raw}[i+3]-((${names.key}+(i+3)*${stride})%${mod}))%${mod})}end;local ${runtimeNames.chunk}={${names.code},{${constants}}};${names.raw}=nil`;
}

function renderConstant(value: unknown, key: number, rng: SeededRng): string {
  if (typeof value === "string") {
    const step = rng.int(19, 241);
    const t = randomIdentifier(rng, rng.int(6, 11));
    const o = randomIdentifier(rng, rng.int(6, 11));
    const i = randomIdentifier(rng, rng.int(6, 11));
    const bytes = [...Buffer.from(value, "utf8")].map((byte, index) => (byte + ((key + (index + 1) * step) % 251)) % 256);
    return `(function(${t})local ${o}={};for ${i}=1,#${t} do ${o}[${i}]=string.char((${t}[${i}]-((${key}+${i}*${step})%251))%256)end;return table.concat(${o})end)({${bytes.join(",")}})`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "nil";
}

function createRuntimeNames(rng: SeededRng): VMRuntimeNames {
  return {
    run: unique(rng),
    chunk: unique(rng),
    pc: unique(rng),
    regs: unique(rng),
    consts: unique(rng),
    code: unique(rng),
    unpacker: unique(rng),
    env: unique(rng),
    get: unique(rng),
    set: unique(rng),
    dispatch: unique(rng),
    ret: unique(rng),
  };
}

function createPayloadNames(rng: SeededRng): Record<"key" | "raw" | "check" | "code", string> {
  return {
    key: unique(rng),
    raw: unique(rng),
    check: unique(rng),
    code: unique(rng),
  };
}

function unique(rng: SeededRng): string {
  return randomIdentifier(rng, rng.int(7, 14));
}

function addFakeInstructions(bytecode: VMInstruction[], rng: SeededRng): VMInstruction[] {
  const out = [...bytecode];
  const count = rng.int(3, 9);
  for (let i = 0; i < count; i += 1) {
    out.push({ op: rng.int(300, 3900), a: rng.int(0, 15), b: rng.int(0, 15), c: rng.int(0, 15) });
  }
  return out;
}
