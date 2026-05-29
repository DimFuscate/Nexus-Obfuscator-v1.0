export const IR_OPCODES = [
  "LOADK",
  "MOVE",
  "GETGLOBAL",
  "SETGLOBAL",
  "GETTABLE",
  "SETTABLE",
  "NEWTABLE",
  "CALL",
  "RETURN",
  "JMP",
  "TEST",
  "EQ",
  "LT",
  "LE",
  "ADD",
  "SUB",
  "MUL",
  "DIV",
  "MOD",
  "POW",
  "UNM",
  "NOT",
  "LEN",
  "CONCAT",
  "CLOSURE",
  "VARARG",
  "FORPREP",
  "FORLOOP",
  "TFORCALL",
  "TFORLOOP",
] as const;

export type IROpcode = (typeof IR_OPCODES)[number];

export interface OpcodeSpec {
  map: Record<IROpcode, number>;
  fakeOpcodes: number[];
  dispatchStyle: "if-chain" | "table";
}
