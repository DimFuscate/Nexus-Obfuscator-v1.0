from __future__ import annotations

from .names import make_context
from .options import ProtectOptions, apply_level_defaults
from .packer import protect_pack
from .transforms import protect_transform


def protect_source(source: str, options: ProtectOptions | None = None) -> str:
    opts = apply_level_defaults(options or ProtectOptions())
    ctx = make_context(source, opts)

    if opts.mode == "pack":
        return protect_pack(source, ctx)
    return protect_transform(source, ctx)

