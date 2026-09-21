## 背景

这是一套给 **OpenClaw** 用的本地文件检索小系统：客户机（或自己的 Linux）上有一堆 PDF / Word / Excel，偶尔还夹着 DWG。希望自然语言能问「某个文件在哪」「哪份文档讲了 XX」「这两份数据对不对」「和这份相关的还有哪些」。

仓库：[huo15-file-rag](https://github.com/Grunray/huo15-file-rag)（私有）。公开时间线很短：**2026-06-09** 当天建仓并完成主要提交。它**不是**某个业务产品的正式交付件；只是在接 OpenClaw agent 时，把「文件库问答」拆成可部署的服务 + skill。文中只谈技术结构，不挂任何甲方品牌。

## 设计原则：RAG 不要包办一切

需求拆开以后，真正适合 RAG 的只有「按内容找」和「部分相关文件发现」。其余用外层编排更稳：

| 需求 | 是否走 RAG | 做法 |
|------|------------|------|
| 文件名定位 | 否 | catalog + fuzzy 文件名匹配 |
| 内容语义检索 | 是 | LightRAG 查询，可只要上下文 |
| 两文件数值对比 | 否 | 抽文本后 LLM 结构化 diff |
| 自动分类归档 | 否 | 直连 LLM 判类后登记 |
| DWG | 间接 | 不解析二进制图纸，索引同名说明文件，命中后指向 `.dwg` 本体 |

底层引擎选 [HKUDS/LightRAG](https://github.com/HKUDS/LightRAG)（知识图谱 + 向量；较新版本自带多格式解析）。LLM / embedding 默认走本机 Ollama（如 `qwen2.5:7b` + `bge-m3`），数据可以完全不出内网。

## 运行时形状

```text
用户 → OpenClaw → skill(frag.py) → HTTP → FastAPI server
                                         ├─ LightRAG → Ollama
                                         ├─ catalog（SQLite 清单 + dwg 同名映射）
                                         ├─ classifier / comparator
                                         └─ 文件网关（下载 / 预览）
```

导入管线大致是：扫目录 → 建 dwg↔说明映射 → 抽文本 → 分类摘要 → `ainsert` 进 LightRAG（带 `file_path`）→ 写入 catalog。查询时 skill 只负责把自然语言落到对应 HTTP 接口。

对比故意不走 RAG：路径已知就不该再「检索」；逐字段对齐用 `format=json` 抽「指标—数值」，比把两份全文丢进检索问「有什么不同」靠谱。

## 部署方式

- **联网单机**：`docker compose` + `deploy.sh`，`.env` 里填 `HOST_SOURCE_DIR`，再 `cli.py ingest`。
- **离线多机**：联网机先装再 `package.sh` 打离线包（含镜像与模型权重），目标机 `deploy-offline.sh`。
- **可选拆分**：embedding 留在 OpenClaw 本机，LLM 集中到一台 GPU 机，靠 `LLM_BINDING_HOST` / `EMBEDDING_BINDING_HOST` 分开。

接入 OpenClaw 时：把 `skill/` 装进 skill 目录，设 `FILE_RAG_API` 指向服务地址即可。

## 局限与扩展

- 相关文件发现是「用摘要再检索 → 回溯命中文件名，不够再按类目补齐」，不是严格的文档相似度排序。
- 文件量上到数万级时，LightRAG 默认轻量存储会吃力，需要换 Postgres / Milvus 一类后端。
- DWG 语义本身不在范围内；没有同名说明文件时，图纸内容问不出来。

一句话：**skill 编排决定「该不该检索」，LightRAG 只负责「内容里找得到谁」。** 这对本机文件库比「一个超级 RAG 端点」更诚实。