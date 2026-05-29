export function xorRollingEncrypt(bytes: number[], key: number): number[] {
  return bytes.map((byte, index) => xorByte(byte, (key + (index + 1) * 31) % 255));
}

export function xorRollingDecrypt(bytes: number[], key: number): number[] {
  return xorRollingEncrypt(bytes, key);
}

export function runtimeXorFallbackLua(): string {
  return "local function __bx(a,b)local r=0;local p=1;while a>0 or b>0 do local aa=a%2;local bb=b%2;if aa~=bb then r=r+p end;a=(a-aa)/2;b=(b-bb)/2;p=p*2 end;return r end";
}

function xorByte(a: number, b: number): number {
  let out = 0;
  let bit = 1;
  while (a > 0 || b > 0) {
    const aa = a % 2;
    const bb = b % 2;
    if (aa !== bb) {
      out += bit;
    }
    a = Math.floor(a / 2);
    b = Math.floor(b / 2);
    bit *= 2;
  }
  return out;
}
