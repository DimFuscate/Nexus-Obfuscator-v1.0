import type { ExpressionNode } from "../parser/astTypes.js";

export function isLiteralExpression(expression: ExpressionNode): boolean {
  return expression.kind === "StringLiteral"
    || expression.kind === "NumericLiteral"
    || expression.kind === "BooleanLiteral"
    || expression.kind === "NilLiteral";
}

export function expressionComplexity(expression: ExpressionNode): number {
  if (expression.kind === "BinaryExpression") {
    return 1 + expressionComplexity(expression.left) + expressionComplexity(expression.right);
  }
  return expression.kind === "UnknownExpression" ? 10 : 1;
}
