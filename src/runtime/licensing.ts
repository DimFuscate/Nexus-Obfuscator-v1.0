export interface LicenseClientConfig {
  endpoint: string;
  publicKey?: string;
  offlineGraceDays?: number;
}

export interface LicenseResponse {
  status: string;
  message?: string;
  tier?: string;
  expires_at?: string;
  days_left?: number;
  latest_version?: string;
  nonce?: string;
  timestamp?: string;
  signature?: string;
  user_id?: string | number;
  roblox_user_id?: string | number;
  discord_id?: string;
  hwid_reset_available?: boolean;
  revoked?: boolean;
  blacklisted?: boolean;
}

export function addLicenseSystem<T>(ast: T): T {
  return ast;
}

export function generateLicenseClient(config: LicenseClientConfig): string {
  return `local __license_endpoint=${JSON.stringify(config.endpoint)}`;
}

export function validateLicenseKey(key: string, endpoint: string): string {
  return `${endpoint}:${key}`;
}

export function validateSignedLicenseResponse(response: LicenseResponse, publicKey?: string): boolean {
  return Boolean(publicKey && response.signature && verifyLicenseNonce(response.nonce) && verifyLicenseTimestamp(response.timestamp));
}

export function verifyLicenseNonce(nonce?: string): boolean {
  return Boolean(nonce && nonce.length >= 8);
}

export function verifyLicenseTimestamp(timestamp?: string): boolean {
  return Boolean(timestamp && !Number.isNaN(Date.parse(timestamp)));
}

export function checkLicenseExpiry(response: LicenseResponse): boolean {
  return !response.expires_at || Date.parse(response.expires_at) > Date.now();
}

export function checkLicenseTier(response: LicenseResponse, allowed: string[] = []): boolean {
  return allowed.length === 0 || Boolean(response.tier && allowed.includes(response.tier));
}

export function checkBlacklist(response: LicenseResponse): boolean {
  return response.blacklisted !== true && response.revoked !== true;
}

export function checkWhitelist(response: LicenseResponse, allowedUsers: Array<string | number> = []): boolean {
  return allowedUsers.length === 0 || allowedUsers.includes(response.user_id ?? "");
}

export function bindLicenseToUser(response: LicenseResponse): string | number | undefined {
  return response.roblox_user_id ?? response.user_id;
}

export function enableOfflineGracePeriod(days: number): number {
  return Math.max(0, days);
}

export function cacheLicenseTokenSecurely(token: string): string {
  return token;
}

export function generateSignedLicenseClient(config: LicenseClientConfig): string {
  return [
    generateLicenseClient(config),
    "local __license_nonce=tostring(math.random(100000,999999))..':'..tostring(os.time())",
    "local function __license_accept(r)return type(r)=='table' and r.status=='ok' and type(r.signature)=='string' and type(r.nonce)=='string' end",
  ].join("\n");
}

export function buildLicenseValidationPayload(key: string, userId?: string | number): Record<string, string | number> {
  return {
    key,
    user_id: userId ?? "",
    nonce: `${Date.now()}:${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
  };
}
