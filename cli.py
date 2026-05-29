from __future__ import annotations

import argparse
from pathlib import Path

from .core import protect_source
from .options import ProtectOptions


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")


def _write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8", newline="\n")


def _normalize_input_arg(raw: str | None) -> Path | None:
    if not raw:
        return None
    if raw.startswith("@"):
        raw = raw[1:]
    return Path(raw)


def _default_output_path(input_path: Path, mode: str, level: str) -> Path:
    suffix = input_path.suffix or ".lua"
    stem = input_path.name[: -len(suffix)] if suffix else input_path.name
    return input_path.with_name(f"{stem}.nexus-{mode}-{level}{suffix}")


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="NexusProtect Roblox Luau obfuscator")
    parser.add_argument("input_path", nargs="?", help="Input .lua/.luau file, optionally prefixed with @")
    parser.add_argument("-i", "--input", dest="input", help="Input .lua/.luau file")
    parser.add_argument("-o", "--output", default=None, help="Protected output file")
    parser.add_argument(
        "--mode",
        choices=["pack", "transform"],
        default="transform",
        help="transform rewrites source tokens and avoids loadstring; pack emits an encrypted loader that requires loadstring",
    )
    parser.add_argument("--level", choices=["light", "medium", "max"], default="medium")
    parser.add_argument("--build-id", default=None, help="Optional deterministic build id")
    parser.add_argument("--watermark", default="nexus", help="Buyer/build watermark")
    parser.add_argument("--seed", type=int, default=None, help="Optional deterministic RNG seed")
    parser.add_argument("--keep-comments", action="store_true", help="Preserve comments in transform mode")
    parser.add_argument("--no-string-encryption", action="store_true", help="Do not encrypt string literals")
    parser.add_argument("--numbers", action="store_true", help="Force numeric constant protection")
    parser.add_argument("--rename-vars", action="store_true", help="Rename local variables, not only local functions")
    parser.add_argument(
        "--guard-functions",
        choices=["off", "sensitive", "all"],
        default="sensitive",
        help="Inject environment assertions into function bodies in transform mode",
    )
    parser.add_argument("--check-every", type=int, default=1, help="Guard check interval")
    parser.add_argument("--chunk-size", type=int, default=384, help="Packed payload chunk size")
    parser.add_argument("--junk-chunks", type=int, default=0, help="Extra fake packed chunks")
    parser.add_argument("--fail-open", action="store_true", help="Set tamper flag instead of erroring")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    input_path = _normalize_input_arg(args.input or args.input_path)
    if input_path is None:
        parser.error("input file is required")
    if not input_path.exists():
        parser.error(f"input file does not exist: {input_path}")

    output_path = Path(args.output) if args.output else _default_output_path(input_path, args.mode, args.level)
    source = _read_text(input_path)
    options = ProtectOptions(
        mode=args.mode,
        level=args.level,
        build_id=args.build_id,
        watermark=args.watermark,
        seed=args.seed,
        strip_comments=not args.keep_comments,
        encrypt_strings=not args.no_string_encryption,
        protect_numbers=args.numbers,
        rename_locals=args.rename_vars,
        guard_functions=args.guard_functions,
        check_every=max(1, args.check_every),
        fail_closed=not args.fail_open,
        chunk_size=max(64, args.chunk_size),
        junk_chunks=max(0, args.junk_chunks),
    )

    protected = protect_source(source, options)
    _write_text(output_path, protected)

    print("NexusProtect build complete")
    print(f"  Input:  {input_path}")
    print(f"  Output: {output_path}")
    print(f"  Mode:   {args.mode}")
    print(f"  Level:  {args.level}")
    print(f"  Size:   {len(protected.encode('utf-8')):,} bytes")
    return 0
# only thing i'd fr let ai make ngl :3 ty Pixy 