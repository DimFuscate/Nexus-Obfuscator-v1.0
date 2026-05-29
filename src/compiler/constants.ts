export const MAX_REGISTERS = 240;
export const FIRST_TEMP_REGISTER = 1;

export class ConstantPool {
  private readonly constants: unknown[] = [];

  add(value: unknown): number {
    const existing = this.constants.findIndex((constant) => Object.is(constant, value));
    if (existing !== -1) {
      return existing + 1;
    }
    this.constants.push(value);
    return this.constants.length;
  }

  values(): unknown[] {
    return [...this.constants];
  }
}
