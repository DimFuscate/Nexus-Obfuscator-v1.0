export interface EnvironmentLockOptions {
  luaVersion?: string;
  robloxPlaceIds?: number[];
  robloxGameIds?: number[];
  robloxUserIds?: number[];
  expiration?: number;
}

export function addEnvironmentLock<T>(ast: T): T {
  return ast;
}

export function lockToLuaVersion(version: string): EnvironmentLockOptions {
  return { luaVersion: version };
}

export function lockToLuau(): EnvironmentLockOptions {
  return { luaVersion: "luau" };
}

export function lockToRobloxPlaceId(placeIds: number[]): EnvironmentLockOptions {
  return { robloxPlaceIds: placeIds };
}

export function lockToRobloxGameId(gameIds: number[]): EnvironmentLockOptions {
  return { robloxGameIds: gameIds };
}

export function lockToUserId(userIds: number[]): EnvironmentLockOptions {
  return { robloxUserIds: userIds };
}

export function lockToExpiration(timestamp: number): EnvironmentLockOptions {
  return { expiration: timestamp };
}

export function validateEnvironmentAtRuntime(options: EnvironmentLockOptions = {}): string {
  const checks = ["typeof and typeof(game)=='Instance'"];
  if (options.expiration) {
    checks.push(`os.time()<${options.expiration}`);
  }
  return checks.join(" and ");
}

export function onEnvironmentMismatch(policy: "silent_return" | "controlled_error" = "controlled_error"): string {
  return policy === "silent_return" ? "return nil" : "error('environment')";
}
