import type { AstNode, ProgramNode } from "./astTypes.js";

export interface AstVisitor {
  enter?(node: AstNode, parent?: AstNode): void;
  leave?(node: AstNode, parent?: AstNode): void;
}

export function walkAST(ast: ProgramNode | AstNode, visitor: AstVisitor): void {
  visit(ast, undefined, visitor);
}

function visit(node: AstNode, parent: AstNode | undefined, visitor: AstVisitor): void {
  visitor.enter?.(node, parent);
  for (const child of node.children ?? []) {
    visit(child, node, visitor);
  }
  visitor.leave?.(node, parent);
}

export function replaceASTNode(root: AstNode, oldNode: AstNode, newNode: AstNode): boolean {
  const children = root.children ?? [];
  const index = children.indexOf(oldNode);
  if (index !== -1) {
    newNode.parent = root;
    children[index] = newNode;
    return true;
  }
  return children.some((child) => replaceASTNode(child, oldNode, newNode));
}
