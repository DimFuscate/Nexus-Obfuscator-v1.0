declare const Buffer: {
  byteLength(value: string, encoding?: string): number;
  from(value: string | number[], encoding?: string): { toString(encoding?: string): string; [Symbol.iterator](): IterableIterator<number> };
};

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

declare module "node:child_process" {
  export function spawnSync(
    command: string,
    args?: string[],
    options?: Record<string, unknown>,
  ): { status: number | null; stdout: string; stderr: string; error?: Error };
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function mkdtempSync(prefix: string): string;
  export function readFileSync(path: string, encoding: string): string;
  export function rmSync(path: string, options?: Record<string, unknown>): void;
  export function statSync(path: string): { size: number };
  export function writeFileSync(path: string, data: string, encoding?: string): void;
}

declare module "node:http" {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    on(event: "data", callback: (chunk: { toString(): string }) => void): this;
    on(event: "end", callback: () => void): this;
    on(event: "error", callback: (error: Error) => void): this;
  }

  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string | number>): this;
    end(data?: string): void;
  }

  export function createServer(
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
  ): {
    once(event: "error", callback: (error: Error & { code?: string }) => void): void;
    listen(port: number, host: string, callback?: () => void): void;
  };
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...parts: string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}
