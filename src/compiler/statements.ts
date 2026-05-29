import type { StatementNode } from "../parser/astTypes.js";

export function isVMEligibleStatement(statement: StatementNode): boolean {
  return statement.kind === "CallStatement"
    || statement.kind === "ReturnStatement"
    || statement.kind === "LocalDeclaration"
    || statement.kind === "AssignmentStatement";
}

export function statementCost(statement: StatementNode): number {
  if (statement.kind === "ControlStatement" || statement.kind === "FunctionDeclaration") {
    return 20;
  }
  if (statement.kind === "UnknownStatement") {
    return 100;
  }
  return 1;
}
