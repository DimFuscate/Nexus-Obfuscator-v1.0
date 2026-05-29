import { FIRST_TEMP_REGISTER, MAX_REGISTERS } from "./constants.js";

export class RegisterAllocator {
  private nextRegister = FIRST_TEMP_REGISTER;
  private readonly locals = new Map<string, number>();

  allocate(): number {
    if (this.nextRegister > MAX_REGISTERS) {
      throw new Error("VM register limit exceeded");
    }
    return this.nextRegister++;
  }

  bindLocal(name: string): number {
    const register = this.allocate();
    this.locals.set(name, register);
    return register;
  }

  resolveLocal(name: string): number | undefined {
    return this.locals.get(name);
  }

  snapshot(): Map<string, number> {
    return new Map(this.locals);
  }
}
