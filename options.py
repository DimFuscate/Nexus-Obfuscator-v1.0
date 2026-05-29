from __future__ import annotations

import dataclasses
import random


@dataclasses.dataclass(slots=True)
class ProtectOptions:
    mode: str = "transform"
    level: str = "medium"
    build_id: str | None = None
    watermark: str = "nexus"
    seed: int | None = None
    strip_comments: bool = True
    encrypt_strings: bool = True
    protect_numbers: bool = False
    rename_locals: bool = False
    rename_local_functions: bool = True
    guard_functions: str = "sensitive"  # off | sensitive | all
    check_every: int = 1
    fail_closed: bool = True
    chunk_size: int = 384
    junk_chunks: int = 0


@dataclasses.dataclass(slots=True)
class ProtectContext:
    options: ProtectOptions
    rng: random.Random
    build_id: str
    names: dict[str, str]
    slots: dict[str, int]


def apply_level_defaults(options: ProtectOptions) -> ProtectOptions:
    opts = dataclasses.replace(options)

    if opts.level == "light":
        opts.rename_local_functions = False
        opts.rename_locals = False
        opts.protect_numbers = False
        opts.guard_functions = "off" if opts.guard_functions == "sensitive" else opts.guard_functions
        opts.check_every = max(opts.check_every, 8)
        opts.chunk_size = max(opts.chunk_size, 768)
        opts.junk_chunks = max(opts.junk_chunks, 1)
    elif opts.level == "medium":
        opts.rename_local_functions = True
        opts.rename_locals = False
        opts.protect_numbers = False
        opts.guard_functions = opts.guard_functions or "sensitive"
        opts.check_every = max(opts.check_every, 4)
        opts.chunk_size = min(max(opts.chunk_size, 256), 768)
        opts.junk_chunks = max(opts.junk_chunks, 2)
    elif opts.level == "max":
        opts.rename_local_functions = True
        opts.rename_locals = True
        opts.protect_numbers = True
        opts.guard_functions = "all" if opts.guard_functions == "sensitive" else opts.guard_functions
        opts.check_every = max(opts.check_every, 1)
        opts.chunk_size = min(max(opts.chunk_size, 128), 384)
        opts.junk_chunks = max(opts.junk_chunks, 5)
    else:
        raise ValueError(f"unknown protection level: {opts.level}")

    if opts.mode not in {"pack", "transform"}:
        raise ValueError("mode must be 'pack' or 'transform'")

    if opts.guard_functions not in {"off", "sensitive", "all"}:
        raise ValueError("guard_functions must be 'off', 'sensitive', or 'all'")

    opts.check_every = max(1, int(opts.check_every or 1))
    opts.chunk_size = max(64, int(opts.chunk_size or 384))
    opts.junk_chunks = max(0, int(opts.junk_chunks or 0))
    return opts
