## 问题

客户丢过来的表很少「长得一样」：横向周需求、T+2 真单、滚动计划、物料到货、DIP 工单排程……中英文混杂，单 sheet / 多 sheet，表头还不在第一行。人手改模板又慢又容易漏改。

这个 OpenClaw skill 做三件事：**识别归类 → 熔解填充 → 新旧差异标注**。目录在 skills 合集里：

[huo15-openclaw-plan-form](https://github.com/Grunray/huo15-skills/tree/main/huo15-openclaw-plan-form)

提交集中在 **2026-06-01**。

## 三个标准模板

| id | 模板 | 大致形态 |
|----|------|----------|
| `demand_schedule` | 客户需求排产表 | 标识列 + 横向周/日需求 + 合计 + 备注 |
| `plan_tracking` | 计划跟踪跟单表 | 按成品料号跟踪库存 / 已交 / 未交 / 结余 / 在制 / 欠料 / 预测 |
| `dip_schedule` | 工厂 DIP 排产计划表 | 工单 + 白班/夜班日排程 + UPH / 人力 / 线体 |

列定义、别名词典、分类关键词、差异主键都收在 `reference/templates_schema.json`，当作单一事实来源；改列只改这一处。

## 五步脚本流

依赖 `pandas` / `openpyxl` / `xlrd`。核心原则：**脚本只建议，agent 来定夺**——置信度低、多 sheet、表头漂移时先看报告，再用参数覆盖，不盲信自动结果。也不臆造数字：源文件没有的量留空，合计用公式。

1. **`inspect_form.py`** — 看 sheet 维度、合并格、疑似表头与日期列  
2. **`classify_form.py`** — 判模板 id + 置信度（medium/low 必须人工复核）  
3. **`extract_form.py`** — 源表 → 规范化 JSON，打印列映射报告；可用 `--mapping` 覆盖  
4. **`fill_template.py`** — JSON → 标准模板；多文件可合并，`--dedup` 按主键合并料号  
5. **`diff_forms.py`** — 新旧按主键比对；红底+批注标变化，绿底标新增，删除项单独成列/sheet  

输出文件名带数据日期和生成时刻（精确到分钟），模板示例数据会自动清掉。

典型一条龙：

```bash
python3 scripts/classify_form.py "客户来的表.xlsx"
python3 scripts/extract_form.py "客户来的表.xlsx" --template demand_schedule --out work/new.norm.json
python3 scripts/fill_template.py work/new.norm.json --out-dir out/
python3 scripts/diff_forms.py --new work/new.norm.json --old "库里/上一版.xlsx" \
  --template demand_schedule --out "out/差异标注.xlsx"
```

## 和 OpenClaw 的关系

`SKILL.md` 写清触发条件：用户上传一个或多个计划 / 排产 / 需求 Excel，要求「统一成模板」「合并多表」或「标出哪里改了」时加载。agent 按五步调脚本，复杂簿先 inspect，再决定 `--sheet` / `--header-row`。

空白参考模板可用 `build_clean_templates.py` 生成到 `assets/templates/`。更细的边界（双行表头、月粒度、星期表头借邻近日期等）见 `reference/workflow.md`。

它解决的是**表单形态归一与变更可视**，不是通用 BI；主键对不上、表头极度离谱时，仍然要人看着映射报告改一刀。