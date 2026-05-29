export interface UpvalueRecord {
  name: string;
  ownerDepth: number;
  register: number;
}

export class UpvalueTracker {
  private readonly records = new Map<string, UpvalueRecord>();

  capture(name: string, ownerDepth: number, register: number): UpvalueRecord {
    const existing = this.records.get(name);
    if (existing) {
      return existing;
    }
    const record = { name, ownerDepth, register };
    this.records.set(name, record);
    return record;
  }

  values(): UpvalueRecord[] {
    return [...this.records.values()];
  }
}
