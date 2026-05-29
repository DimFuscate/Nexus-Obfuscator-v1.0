import type { ProgramNode } from "./astTypes.js";

export function cloneAST<T extends ProgramNode>(ast: T): T {
  return structuredClone(ast);
}
