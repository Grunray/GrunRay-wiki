"""把骨架路径注入 index.html，并更新 F 方案 CSS。"""
from pathlib import Path

html_path = Path(r"e:\Project\GrunRay_wiki\designed\hover-options\index.html")
paths = Path(r"e:\Project\GrunRay_wiki\designed\hover-options\grow-paths.txt").read_text(encoding="utf-8").strip()
html = html_path.read_text(encoding="utf-8")

old_css = """  /* 生长遮罩的描边：非 hover 态隐藏 + 收回速度 */
  .opt-f .grow {
    fill: none;
    stroke: #fff;
    stroke-linecap: round;
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    transition: stroke-dashoffset 0.5s var(--ease);
  }
  .opt-f .grow-main { stroke-width: 46; }
  .opt-f .grow-sub { stroke-width: 38; }
  .opt-f .grow-thin { stroke-width: 28; }
  .opt-f .grow-spike { stroke-width: 40; }

  /* hover：主茎 1s 绘制；各枝杈按主茎到达时间错时接上，全部沿路径画出 */
  .opt-f .tcard:hover .grow,
  .opt-f .ccard:hover .grow { stroke-dashoffset: 0; transition-duration: 1s; }
  .opt-f .tcard:hover .grow-sub, .opt-f .tcard:hover .grow-thin, .opt-f .tcard:hover .grow-spike,
  .opt-f .ccard:hover .grow-sub, .opt-f .ccard:hover .grow-thin, .opt-f .ccard:hover .grow-spike {
    transition-duration: 0.5s;
  }
  .opt-f .tcard:hover .grow-bottom, .opt-f .ccard:hover .grow-bottom { transition-delay: 0.3s; }
  .opt-f .tcard:hover .grow-leaf-l2, .opt-f .ccard:hover .grow-leaf-l2 { transition-delay: 0.42s; }
  .opt-f .tcard:hover .grow-leaf-l1, .opt-f .ccard:hover .grow-leaf-l1 { transition-delay: 0.48s; }
  .opt-f .tcard:hover .grow-right, .opt-f .ccard:hover .grow-right { transition-delay: 0.55s; }
  .opt-f .tcard:hover .grow-tendril, .opt-f .ccard:hover .grow-tendril { transition-delay: 0.62s; }
  .opt-f .tcard:hover .grow-spike, .opt-f .ccard:hover .grow-spike { transition-delay: 0.85s; }
  .opt-f .tcard:hover .grow-spike-r, .opt-f .ccard:hover .grow-spike-r { transition-delay: 0.95s; }
  .opt-f .tcard:hover .grow-spike-l, .opt-f .ccard:hover .grow-spike-l { transition-delay: 1s; }"""

new_css = """  /* 生长遮罩：骨架路径 dashoffset 绘制。线宽故意大于剪影半径，
     过冲由 PNG alpha mask 裁掉，从而保证画满且仍是沿线画出。
     delay 写在每条 path 的 --grow-delay 上；离开时 delay=0 一起收回。 */
  .opt-f .grow {
    fill: none;
    stroke: #fff;
    stroke-width: 48;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    transition: stroke-dashoffset 0.4s var(--ease);
    transition-delay: 0s;
  }
  .opt-f .grow-main { stroke-width: 52; }
  .opt-f .tcard:hover .grow,
  .opt-f .ccard:hover .grow {
    stroke-dashoffset: 0;
    transition-delay: var(--grow-delay, 0s);
    transition-duration: 0.48s;
  }
  .opt-f .tcard:hover .grow-main,
  .opt-f .ccard:hover .grow-main { transition-duration: 1.05s; }"""

if old_css not in html:
    raise SystemExit("old css not found")
html = html.replace(old_css, new_css)

# 替换两处 mask 内的 path 列表（黑底 rect 保留）
import re
pat = re.compile(
    r'(<mask id="fv-grow-[tc]" maskUnits="userSpaceOnUse">\s*'
    r'<rect width="326" height="327" fill="#000" />\s*)'
    r'(?:<path[^/]*/>\s*)+'
    r'(</mask>)'
)

def repl(m):
    return m.group(1) + paths + "\n              " + m.group(2)

html2, n = pat.subn(repl, html)
if n != 2:
    raise SystemExit(f"mask replace count {n}, expected 2")

html2 = html2.replace(
    "使用你提供的花藤剪影（逆时针旋转 45°、染主题 accent 色），hover 时沿主茎从右下角把整枝花藤「画」出来——主茎先行，左右分枝与卷须错时跟上，离开即沿原路收回。位图通过 SVG 双重 mask 获得矢量生长动效。",
    "使用你提供的花藤剪影（逆时针旋转 45°、染主题 accent 色）。hover 时从右下角沿植株骨架把每一条枝、每一片叶都「画」出来——主干先行，侧枝按接到主干的时机错时跟上；离开沿原路收回。没有淡出，全部是路径绘制。",
)

html_path.write_text(html2, encoding="utf-8")
print("patched ok")
