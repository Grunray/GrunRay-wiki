"""把 Pygments 词法器的规则表导出为 JSON，供 backend-java 的高亮引擎加载。

规则来自 Pygments 运行时处理后的 `_tokens`（已展开 include / inherit / words），
正则经 `re._parser` 解析后重新生成 Java 语法，避免手工转写出错。

    python tools/contract/dump_pygments_lexers.py   # 写 backend-java/src/main/resources/highlight/pygments-lexers.json
"""
from __future__ import annotations

import json
import re
import re._constants as K
import re._parser as P
from pathlib import Path

import pygments
from pygments.lexer import RegexLexer
from pygments.lexers import get_lexer_by_name
from pygments.lexers.c_cpp import CFamilyLexer
from pygments.token import STANDARD_TYPES, Keyword, Name

import common as C

OUT = C.REPO_ROOT / "backend-java" / "src" / "main" / "resources" / "highlight" / "pygments-lexers.json"

# backend/content 与 import 里出现过的语言（cpp / text / js / python / bash）加上同引擎的 C
LEXERS = ("c", "cpp", "javascript", "bash", "python")

_CATEGORY = {
    K.CATEGORY_DIGIT: r"\d",
    K.CATEGORY_NOT_DIGIT: r"\D",
    K.CATEGORY_SPACE: r"\s",
    K.CATEGORY_NOT_SPACE: r"\S",
    K.CATEGORY_WORD: r"\w",
    K.CATEGORY_NOT_WORD: r"\W",
}
_AT = {
    K.AT_BEGINNING: "^",
    K.AT_BEGINNING_STRING: r"\A",
    K.AT_END: "$",
    K.AT_END_STRING: r"\z",
    K.AT_BOUNDARY: r"\b",
    K.AT_NON_BOUNDARY: r"\B",
}
_INLINE_FLAGS = ((re.IGNORECASE, "i"), (re.MULTILINE, "m"), (re.DOTALL, "s"))


class Unsupported(Exception):
    pass


def lit(cp: int) -> str:
    ch = chr(cp)
    if ch.isascii() and (ch.isalnum() or ch == "_"):
        return ch
    if not ch.isascii() and ch.isprintable() and not 0xD800 <= cp <= 0xDFFF:
        return ch
    return f"\\x{{{cp:X}}}"


def emit_class(items) -> str:
    out = []
    negate = False
    for op, av in items:
        if op is K.NEGATE:
            negate = True
        elif op is K.LITERAL:
            out.append(lit(av))
        elif op is K.RANGE:
            out.append(f"{lit(av[0])}-{lit(av[1])}")
        elif op is K.CATEGORY:
            out.append(_CATEGORY[av])
        else:
            raise Unsupported(f"class item {op}")
    return "[" + ("^" if negate else "") + "".join(out) + "]"


def quant(lo: int, hi: int) -> str:
    if hi is K.MAXREPEAT or hi == K.MAXREPEAT:
        return {0: "*", 1: "+"}.get(lo, f"{{{lo},}}")
    if lo == 0 and hi == 1:
        return "?"
    if lo == hi:
        return f"{{{lo}}}"
    return f"{{{lo},{hi}}}"


def flag_letters(flags: int) -> str:
    return "".join(letter for bit, letter in _INLINE_FLAGS if flags & bit)


def emit(seq) -> str:
    out = []
    for op, av in seq:
        if op is K.LITERAL:
            out.append(lit(av))
        elif op is K.NOT_LITERAL:
            out.append(f"[^{lit(av)}]")
        elif op is K.ANY:
            out.append(".")
        elif op is K.IN:
            out.append(emit_class(av))
        elif op is K.BRANCH:
            out.append("(?:" + "|".join(emit(alt) for alt in av[1]) + ")")
        elif op is K.SUBPATTERN:
            group, add, delete, sub = av
            if group is None:
                flags = flag_letters(add) + ("-" + flag_letters(delete) if flag_letters(delete) else "")
                out.append(f"(?{flags}:" + emit(sub) + ")")
            else:
                if add or delete:
                    raise Unsupported("flags on capturing group")
                out.append("(" + emit(sub) + ")")
        elif op in (K.MAX_REPEAT, K.MIN_REPEAT, K.POSSESSIVE_REPEAT):
            lo, hi, sub = av
            suffix = {K.MAX_REPEAT: "", K.MIN_REPEAT: "?", K.POSSESSIVE_REPEAT: "+"}[op]
            out.append("(?:" + emit(sub) + ")" + quant(lo, hi) + suffix)
        elif op is K.AT:
            out.append(_AT[av])
        elif op in (K.ASSERT, K.ASSERT_NOT):
            direction, sub = av
            head = {(K.ASSERT, 1): "(?=", (K.ASSERT, -1): "(?<=", (K.ASSERT_NOT, 1): "(?!", (K.ASSERT_NOT, -1): "(?<!"}
            out.append(head[(op, direction)] + emit(sub) + ")")
        elif op is K.GROUPREF:
            out.append(f"(?:\\{av})")
        elif op is K.ATOMIC_GROUP:
            out.append("(?>" + emit(av) + ")")
        else:
            raise Unsupported(f"opcode {op}")
    return "".join(out)


def to_java(compiled: re.Pattern) -> dict:
    parsed = P.parse(compiled.pattern, compiled.flags & ~re.UNICODE)
    java = emit(parsed)
    if re.compile(compiled.pattern).groups != compiled.groups:
        raise Unsupported("group count")
    return {
        "regex": java,
        "groups": compiled.groups,
        "m": bool(compiled.flags & re.MULTILINE),
        "s": bool(compiled.flags & re.DOTALL),
        "i": bool(compiled.flags & re.IGNORECASE),
    }


def token_entry(ttype) -> dict:
    if ttype not in STANDARD_TYPES:
        raise Unsupported(f"non-standard token {ttype}")
    return {"css": STANDARD_TYPES[ttype], "name": str(ttype)}


def closure(fn) -> dict:
    return {name: cell.cell_contents for name, cell in zip(fn.__code__.co_freevars, fn.__closure__ or ())}


def action_entry(action, lexer_cls):
    if action is None:
        return None
    if type(action).__name__ == "_TokenType":
        return {"token": token_entry(action)}
    qn = getattr(action, "__qualname__", "")
    if qn == "bygroups.<locals>.callback":
        groups = []
        for item in closure(action)["args"]:
            if item is None:
                groups.append(None)
            elif type(item).__name__ == "_TokenType":
                groups.append({"token": token_entry(item)})
            elif getattr(item, "__qualname__", "") == "using.<locals>.callback":
                cells = closure(item)
                if cells.get("_other") is not None and type(cells["_other"]).__name__ != "_This":
                    raise Unsupported("using(other lexer)")
                if cells.get("kwargs"):
                    raise Unsupported("using(**kwargs)")
                stack = list(cells.get("gt_kwargs", {}).get("stack", ("root",)))
                groups.append({"using": stack})
            else:
                raise Unsupported(f"bygroups item {item!r}")
        return {"bygroups": groups}
    raise Unsupported(f"callback {qn}")


def transition_entry(new_state):
    if new_state is None:
        return None
    if isinstance(new_state, int):
        return {"pop": -new_state}
    if new_state == "#push":
        return {"push": ["#push"]}
    if isinstance(new_state, tuple):
        return {"push": list(new_state)}
    raise Unsupported(f"transition {new_state!r}")


def dump_lexer(alias: str, patterns: list[dict], pattern_ids: dict[str, int]) -> dict:
    lexer = get_lexer_by_name(alias)
    cls = type(lexer)
    if not issubclass(cls, RegexLexer):
        raise Unsupported("not a RegexLexer")
    states = {}
    for state, rules in cls._tokens.items():
        entries = []
        for rexmatch, action, new_state in rules:
            pattern = to_java(rexmatch.__self__)
            key = json.dumps(pattern, sort_keys=True)
            if key not in pattern_ids:
                pattern_ids[key] = len(patterns)
                patterns.append(pattern)
            entries.append({
                "pattern": pattern_ids[key],
                "action": action_entry(action, cls),
                "next": transition_entry(new_state),
            })
        states[state] = entries
    out = {"name": cls.name, "aliases": list(cls.aliases), "states": states}
    if issubclass(cls, CFamilyLexer):
        names = set()
        for attr in ("stdlib_types", "c99_types", "c11_atomic_types", "linux_types"):
            names |= getattr(cls, attr)
        # CFamilyLexer.get_tokens_unprocessed：Name 命中标准库类型名时改成 Keyword.Type
        out["postprocess"] = {"from": str(Name), "to": token_entry(Keyword.Type), "values": sorted(names)}
    elif cls.get_tokens_unprocessed is not RegexLexer.get_tokens_unprocessed:
        raise Unsupported("custom get_tokens_unprocessed")
    return out


def main() -> None:
    lexers = {}
    patterns: list[dict] = []
    pattern_ids: dict[str, int] = {}
    for alias in LEXERS:
        data = dump_lexer(alias, patterns, pattern_ids)
        lexers[data["aliases"][0]] = data
    payload = {
        "generator": "tools/contract/dump_pygments_lexers.py",
        "pygments": pygments.__version__,
        "license": "Rules derived from Pygments (BSD-2-Clause, Copyright 2006-present by the Pygments team).",
        "patterns": patterns,
        "lexers": lexers,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    # 每条正则、每条规则各占一行，方便升级 Pygments 后看 diff
    lines = ["{"]
    for key in ("generator", "pygments", "license"):
        lines.append(f" {json.dumps(key)}:{json.dumps(payload[key], ensure_ascii=False)},")
    lines.append(' "patterns":[')
    lines.append(",\n".join("  " + json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in patterns))
    lines.append(" ],")
    lines.append(' "lexers":{')
    lexer_blocks = []
    for name, lx in lexers.items():
        head = {k: v for k, v in lx.items() if k != "states"}
        block = [f"  {json.dumps(name)}:{{"]
        for k, v in head.items():
            block.append(f"   {json.dumps(k)}:{json.dumps(v, ensure_ascii=False, separators=(',', ':'))},")
        block.append('   "states":{')
        state_blocks = []
        for state, rules in lx["states"].items():
            body = ",\n".join("     " + json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rules)
            state_blocks.append(f"    {json.dumps(state)}:[\n{body}\n    ]")
        block.append(",\n".join(state_blocks))
        block.append("   }")
        block.append("  }")
        lexer_blocks.append("\n".join(block))
    lines.append(",\n".join(lexer_blocks))
    lines.append(" }")
    lines.append("}")
    text = "\n".join(lines) + "\n"
    if json.loads(text) != payload:
        raise SystemExit("格式化后的 JSON 与原数据不一致")
    OUT.write_text(text, encoding="utf-8")
    total = sum(len(r) for lx in lexers.values() for r in lx["states"].values())
    print(
        f"已写 {OUT.relative_to(C.REPO_ROOT)}：{len(lexers)} 个词法器，{total} 条规则，"
        f"{len(patterns)} 个不同正则（Pygments {pygments.__version__}，{OUT.stat().st_size // 1024} KB）"
    )


if __name__ == "__main__":
    main()
