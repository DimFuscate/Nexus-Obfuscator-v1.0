from __future__ import annotations

import hashlib
import random
import secrets
from datetime import datetime, timezone

from .constants import PROTECTED_NAMES
from .options import ProtectContext, ProtectOptions


RUNTIME_RESERVED_IDS = {
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
}


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def lua_quote(value: str) -> str:
    replacements = {
        "\\": "\\\\",
        '"': '\\"',
        "\n": "\\n",
        "\r": "\\r",
        "\t": "\\t",
        "\0": "\\0",
    }
    return '"' + "".join(replacements.get(ch, ch) for ch in value) + '"'


def make_build_id(source: str, rng: random.Random) -> str:
    nonce = f"{rng.getrandbits(64):016x}"
    digest = hashlib.sha256((source + nonce).encode("utf-8")).hexdigest()[:12]
    return f"NXP-{digest}-{nonce[:6]}"


def make_identifier(rng: random.Random, used: set[str]) -> str:
    first_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    tail_chars = first_chars + "0123456789"
    while True:
        length = rng.randint(2, 3)
        value = rng.choice(first_chars) + "".join(rng.choice(tail_chars) for _ in range(length - 1))
        if value not in used and value not in PROTECTED_NAMES:
            used.add(value)
            return value


def make_context(source: str, options: ProtectOptions) -> ProtectContext:
    seed = options.seed if options.seed is not None else secrets.randbits(64)
    rng = random.Random(seed)
    build_id = options.build_id or make_build_id(source, rng)
    used: set[str] = set(RUNTIME_RESERVED_IDS)
    names = {
        "D": make_identifier(rng, used),
        "P": make_identifier(rng, used),
        "G": make_identifier(rng, used),
        "A": make_identifier(rng, used),
        "E": make_identifier(rng, used),
        "F": make_identifier(rng, used),
        "H": make_identifier(rng, used),
        "SDK": make_identifier(rng, used),
        "R": make_identifier(rng, used),
        "C": make_identifier(rng, used),
        "B": make_identifier(rng, used),
    }

    slot_values = list(range(1, 8))
    rng.shuffle(slot_values)
    slots = {
        "data": slot_values[0],
        "seed": slot_values[1],
        "salt": slot_values[2],
        "index": slot_values[3],
        "tag": slot_values[4],
        "hash": slot_values[5],
        "size": slot_values[6],
    }

    return ProtectContext(options=options, rng=rng, build_id=build_id, names=names, slots=slots)
