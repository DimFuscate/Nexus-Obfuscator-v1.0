import type { OpcodeSpec } from "./opcodeSpec.js";

export interface VMRuntimeNames {
  run: string;
  chunk: string;
  pc: string;
  regs: string;
  consts: string;
  code: string;
  unpacker: string;
  env: string;
  get: string;
  set: string;
  dispatch: string;
  ret: string;
}

export function generateVMInterpreter(vmSpec: OpcodeSpec, n: VMRuntimeNames = {
  run: "__run",
  chunk: "__chunk",
  pc: "__pc",
  regs: "__regs",
  consts: "__const",
  code: "__code",
  unpacker: "__unpack",
  env: "__env",
  get: "__get",
  set: "__set",
  dispatch: "__dispatch",
  ret: "__ret",
}): string {
  const h: string[] = [];
  const r = n.regs;
  const k = n.consts;
  const d = n.dispatch;
  const u = n.unpacker;
  const ret = n.ret;

  h.push(`${d}[${vmSpec.map.LOADK}]=function(i)${r}[i[2]]=${k}[i[3]]end`);
  h.push(`${d}[${vmSpec.map.MOVE}]=function(i)${r}[i[2]]=${r}[i[3]]end`);
  h.push(`${d}[${vmSpec.map.GETGLOBAL}]=function(i)${r}[i[2]]=${n.get}(${k}[i[3]])end`);
  h.push(`${d}[${vmSpec.map.SETGLOBAL}]=function(i)${n.set}(${k}[i[3]],${r}[i[2]])end`);
  h.push(`${d}[${vmSpec.map.GETTABLE}]=function(i)${r}[i[2]]=${r}[i[3]][${k}[i[4]]]end`);
  h.push(`${d}[${vmSpec.map.SETTABLE}]=function(i)${r}[i[2]][${k}[i[3]]]=${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.NEWTABLE}]=function(i)${r}[i[2]]={}end`);
  h.push(`${d}[${vmSpec.map.ADD}]=function(i)${r}[i[2]]=${r}[i[3]]+${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.SUB}]=function(i)${r}[i[2]]=${r}[i[3]]-${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.MUL}]=function(i)${r}[i[2]]=${r}[i[3]]*${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.DIV}]=function(i)${r}[i[2]]=${r}[i[3]]/${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.MOD}]=function(i)${r}[i[2]]=${r}[i[3]]%${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.POW}]=function(i)${r}[i[2]]=${r}[i[3]]^${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.CONCAT}]=function(i)${r}[i[2]]=tostring(${r}[i[3]])..tostring(${r}[i[4]])end`);
  h.push(`${d}[${vmSpec.map.EQ}]=function(i)${r}[i[2]]=${r}[i[3]]==${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.LT}]=function(i)${r}[i[2]]=${r}[i[3]]<${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.LE}]=function(i)${r}[i[2]]=${r}[i[3]]<=${r}[i[4]]end`);
  h.push(`${d}[${vmSpec.map.JMP}]=function(i)${n.pc}=i[2]end`);
  h.push(`${d}[${vmSpec.map.TEST}]=function(i)if not ${r}[i[2]]then ${n.pc}=i[3]end end`);
  h.push(`${d}[${vmSpec.map.CALL}]=function(i)local a={};for j=1,i[3]do a[j]=${r}[i[2]+j]end;local b={${r}[i[2]](${u}(a))};for j=1,i[4]do ${r}[i[2]+j-1]=b[j]end end`);
  h.push(`${d}[${vmSpec.map.RETURN}]=function(i)local a={};for j=1,(i[3]or 0)do a[j]=${r}[i[2]+j-1]end;${ret}=a;return 1 end`);

  return `local function ${n.run}(${n.chunk},...)local ${n.pc}=1;local ${r}={};local ${k}=${n.chunk}[2]or{};local ${n.code}=${n.chunk}[1]or{};local ${u}=(table and table.unpack)or unpack;local ${n.env}=(getfenv and getfenv(0))or _G;local function ${n.get}(p)local c=${n.env};for q in string.gmatch(p,"[^%.]+")do if c==nil then return nil end;c=c[q]end;return c end;local function ${n.set}(p,v)local c=${n.env};local q=nil;for x in string.gmatch(p,"[^%.]+")do if q~=nil then c=c[q]end;q=x end;if c~=nil and q~=nil then c[q]=v end end;local ${d}={};local ${ret}=nil;${h.join(";")};while true do local i=${n.code}[${n.pc}];${n.pc}=${n.pc}+1;if not i then return nil end;local x=${d}[i[1]];if not x then return nil end;if x(i)then return ${u}(${ret})end end end`;
}

export function generateOpcodeHandlers(vmSpec: OpcodeSpec): Record<string, number> {
  return vmSpec.map;
}
