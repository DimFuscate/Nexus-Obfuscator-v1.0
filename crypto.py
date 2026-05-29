from __future__ import annotations

import random
from typing import Iterable


def djb2_hex(data: str | bytes) -> str:
    if isinstance(data, str):
        raw = data.encode("utf-8")
    else:
        raw = data

    h1 = 5381
    h2 = 52711
    for byte in raw:
        h1 = ((h1 * 33) + byte) % 4294967296
        h2 = ((h2 * 65599) + byte) % 4294967296
    return f"{h1:08x}{h2:08x}"


def encrypt_additive(data: bytes, rng: random.Random) -> tuple[list[int], int, int]:
    key = rng.randint(11, 247)
    salt = rng.randint(3, 241)
    encoded = [
        (byte + key + (((index + 1) * salt) % 251)) % 256
        for index, byte in enumerate(data)
    ]
    return encoded, key, salt


def encrypt_stream(data: bytes, rng: random.Random) -> tuple[list[int], int, int]:

    seed = rng.randint(0x10000000, 0x7FFFFFFF)
    salt = rng.randint(17, 251)
    state = seed
    encoded: list[int] = []

    for index, byte in enumerate(data, start=1):
        state = (state * 1103515245 + 12345 + (salt * index)) % 2147483648
        mask = (state // 65536) % 256
        pad = (salt * index) % 251
        encoded.append((byte + mask + pad) % 256)

    return encoded, seed, salt


def format_int_table(values: Iterable[int], indent: str = "") -> str:
    nums = [str(value) for value in values]
    if len(nums) <= 24:
        return "{" + ",".join(nums) + "}"

    lines = []
    for index in range(0, len(nums), 24):
        lines.append(indent + "    " + ",".join(nums[index : index + 24]))
    return "{\n" + ",\n".join(lines) + "\n" + indent + "}"


def base85_encode(data: bytes | list[int]) -> str:
    raw = bytes(data)
    out: list[str] = []

    for index in range(0, len(raw), 4):
        chunk = raw[index : index + 4]
        if len(chunk) < 4:
            chunk = chunk + (b"\0" * (4 - len(chunk)))

        value = int.from_bytes(chunk, "big")
        chars = [""] * 5
        for pos in range(4, -1, -1):
            chars[pos] = chr((value % 85) + 33)
            value //= 85
        out.extend(chars)

    return "".join(out)
