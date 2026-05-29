from __future__ import annotations

import dataclasses
import re


@dataclasses.dataclass(slots=True)
class Segment:
    kind: str
    text: str
    value: bytes | None = None


def _long_bracket_open(source: str, index: int) -> tuple[int, int] | None:
    if index >= len(source) or source[index] != "[":
        return None

    cursor = index + 1
    while cursor < len(source) and source[cursor] == "=":
        cursor += 1

    if cursor < len(source) and source[cursor] == "[":
        return cursor - index - 1, cursor + 1

    return None


def _find_long_bracket_close(source: str, content_start: int, level: int) -> int:
    close = "]" + ("=" * level) + "]"
    close_index = source.find(close, content_start)
    if close_index < 0:
        return len(source)
    return close_index + len(close)


def _parse_long_string(source: str, index: int) -> tuple[str, bytes, int]:
    opened = _long_bracket_open(source, index)
    if opened is None:
        raise ValueError("expected long bracket")

    level, content_start = opened
    end = _find_long_bracket_close(source, content_start, level)
    close_len = 2 + level
    content_end = max(content_start, end - close_len)
    content = source[content_start:content_end]

    if content.startswith("\r\n"):
        content = content[2:]
    elif content.startswith("\n") or content.startswith("\r"):
        content = content[1:]

    return source[index:end], content.encode("utf-8"), end


def _consume_decimal_escape(source: str, index: int) -> tuple[bytes, int]:
    end = index
    while end < len(source) and source[end].isdigit() and end - index < 3:
        end += 1
    return bytes([int(source[index:end], 10) % 256]), end


def _parse_short_string(source: str, index: int) -> tuple[str, bytes, int]:
    quote = source[index]
    cursor = index + 1
    out = bytearray()

    while cursor < len(source):
        ch = source[cursor]

        if ch == quote:
            cursor += 1
            break

        if ch != "\\":
            out.extend(ch.encode("utf-8"))
            cursor += 1
            continue

        if cursor + 1 >= len(source):
            out.extend(b"\\")
            cursor += 1
            continue

        esc = source[cursor + 1]
        cursor += 2

        mapped = {
            "a": b"\a",
            "b": b"\b",
            "f": b"\f",
            "n": b"\n",
            "r": b"\r",
            "t": b"\t",
            "v": b"\v",
            "\\": b"\\",
            '"': b'"',
            "'": b"'",
        }.get(esc)
        if mapped is not None:
            out.extend(mapped)
            continue

        if esc in "\r\n":
            if esc == "\r" and cursor < len(source) and source[cursor] == "\n":
                cursor += 1
            out.extend(b"\n")
            continue

        if esc == "z":
            while cursor < len(source) and source[cursor].isspace():
                cursor += 1
            continue

        if esc.isdigit():
            value, cursor = _consume_decimal_escape(source, cursor - 1)
            out.extend(value)
            continue

        if esc == "x" and cursor + 1 < len(source):
            raw = source[cursor : cursor + 2]
            if re.fullmatch(r"[0-9a-fA-F]{2}", raw):
                out.append(int(raw, 16))
                cursor += 2
                continue

        if esc == "u" and cursor < len(source) and source[cursor] == "{":
            close = source.find("}", cursor + 1)
            if close > cursor + 1:
                raw = source[cursor + 1 : close]
                if re.fullmatch(r"[0-9a-fA-F]+", raw):
                    out.extend(chr(int(raw, 16)).encode("utf-8"))
                    cursor = close + 1
                    continue

        out.extend(esc.encode("utf-8"))

    return source[index:cursor], bytes(out), cursor


def scan_lua(source: str) -> list[Segment]:
    segments: list[Segment] = []
    cursor = 0
    code_start = 0

    def flush_code(end: int) -> None:
        nonlocal code_start
        if end > code_start:
            segments.append(Segment("code", source[code_start:end]))
        code_start = end

    while cursor < len(source):
        ch = source[cursor]
        next_two = source[cursor : cursor + 2]

        if next_two == "--":
            flush_code(cursor)
            opened = _long_bracket_open(source, cursor + 2)
            if opened is not None:
                level, content_start = opened
                end = _find_long_bracket_close(source, content_start, level)
            else:
                newline = source.find("\n", cursor + 2)
                end = len(source) if newline < 0 else newline
            segments.append(Segment("comment", source[cursor:end]))
            cursor = end
            code_start = cursor
            continue

        if ch in ("'", '"'):
            flush_code(cursor)
            text, value, end = _parse_short_string(source, cursor)
            segments.append(Segment("string", text, value))
            cursor = end
            code_start = cursor
            continue

        if ch == "[" and _long_bracket_open(source, cursor) is not None:
            flush_code(cursor)
            text, value, end = _parse_long_string(source, cursor)
            segments.append(Segment("string", text, value))
            cursor = end
            code_start = cursor
            continue

        cursor += 1

    flush_code(len(source))
    return segments

