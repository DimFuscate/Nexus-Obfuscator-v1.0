from __future__ import annotations

from .lua_scan import scan_lua


def _is_word_char(value: str) -> bool:
    return value == "_" or value.isalnum()


def _needs_separator(previous: str, next_char: str) -> bool:
    if not previous or not next_char:
        return False
    if _is_word_char(previous) and _is_word_char(next_char):
        return True
    if previous == "-" and next_char == "-":
        return True
    if previous == "." and next_char == ".":
        return True
    return False


def _last_char(chunks: list[str]) -> str:
    if not chunks:
        return ""
    return chunks[-1][-1:] if chunks[-1] else ""


def _minify_code_segment(code: str, chunks: list[str]) -> None:
    index = 0
    while index < len(code):
        ch = code[index]
        if ch.isspace():
            while index < len(code) and code[index].isspace():
                index += 1
            next_char = code[index] if index < len(code) else ""
            if _needs_separator(_last_char(chunks), next_char):
                chunks.append(" ")
            continue

        chunks.append(ch)
        index += 1


def minify_lua(source: str) -> str:
    chunks: list[str] = []

    for segment in scan_lua(source):
        if segment.kind == "comment":
            if _needs_separator(_last_char(chunks), "\n"):
                chunks.append(" ")
            continue
        if segment.kind == "string":
            chunks.append(segment.text)
            continue
        _minify_code_segment(segment.text, chunks)

    return "".join(chunks).strip()


def banner_plus_one_line(source: str, banner: str) -> str:
    return banner.rstrip() + "\n" + minify_lua(source) + "\n"

