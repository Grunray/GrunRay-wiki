---
public_id: proj-hltv-news-title-crawler
slug: hltv-news-title-crawler
title: HLTV 新闻标题爬虫与数据链路（大作业）
summary: 围绕 HLTV 电竞新闻构建采集→PySpark 预处理→MongoDB/MySQL/Memurai 存储→词频与 ItemCF 推荐→简易 Web 展示的完整数据链路，并针对 Windows 下 Spark/Java/Hadoop 与实体抽取噪声做了工程化处理。
tags:
  - Python
  - PySpark
  - Playwright
  - MongoDB
  - MySQL
  - 大数据
locale: zh
status: archived
featured: false
year: 2026
start_date: '2026-04-27'
end_date: '2026-04-30'
github_url: https://github.com/Grunray/HLTV-News-Title-Crawler
demo_url: ''
layout:
  - type: overview
    title: 概览
    body: |
        本文档概括本大作业项目用到的技术、特点与解决的问题，并记录开发过程中遇到的主要问题、原因与处理方式。
  - type: markdown
    title: 项目简介
    body: |
        ## 项目做什么

        围绕 **HLTV 电竞新闻** 构建一条完整的数据链路：**采集 → 预处理 → 多库存储 → 统计分析 → 协同过滤推荐 → 简易 Web 展示**。数据覆盖多年份 JSONL，经清洗后用于词频、聚合表与 ItemCF 模型，并在浏览器中做结果演示。

        ## 用到的技术

        | 类别 | 技术 | 用途简述 |
        |------|------|----------|
        | 采集 | Python、Playwright、BeautifulSoup、lxml | 绕过常见静态请求限制，渲染页面并解析归档与正文 |
        | 预处理 | PySpark 3.x | 分布式读取 JSONL、窗口去重、缺失值与脏数据清洗、写出 JSON/Parquet |
        | 存储 | MongoDB、pymongo | 文档型存储：原始新闻、可选清洗结果 |
        | 存储 | MySQL、pymysql | 关系型存储：年度 TopN、月度趋势、同比增长、共现边等聚合表 |
        | 缓存 / 高并发演示 | Memurai、redis 客户端 | Windows 下兼容 Redis 协议，缓存热点查询并做并发压测对比 |
        | 分析 | Python（标准库 + Counter 等） | 词频统计、ItemCF 训练与查询 |
        | 展示 | HTML5、CSS、原生 JavaScript | 本地 `http.server` 托管，拉取报告与 JSON 做表格展示 |
        | 工程 | 虚拟环境、UTF-8 文本、JSONL | 依赖隔离、数据交换格式 |

        ## 项目特点

        1. **链路完整**：从爬虫落盘到 Spark 清洗、双库分工、缓存加速、推荐与词频、前端可读。
        2. **贴合课程要求**：实验一（预处理）、实验二（Mongo + MySQL + Redis/Memurai）、实验三（协同过滤 + 词频类分析）均有对应脚本与产出物。
        3. **Windows 可运行**：针对本机环境做了 Spark/Hadoop/Java 与导入路径的兼容处理（见「开发回顾」）。
        4. **可解释推荐**：基于**新闻内实体共现**的 **ItemCF**，无用户评分时仍能给出口径清晰的「相似战队/选手」结果。
        5. **噪声分层治理**：`ignore_words`、`player_noise` 与 Spark 清洗、词频/ItemCF 脚本侧规则一致，减少标题抽取带来的伪 `players`。

        ## 解决了什么问题

        | 问题域 | 说明 |
        |--------|------|
        | 数据采集 | 目标站点动态渲染与防护较多，用浏览器自动化稳定拉取归档与可选正文 |
        | 数据质量 | 去重、缺失、非法 URL/日期、伪选手名与约定噪声词等，在预处理阶段统一规范 |
        | 存储选型 | 明细与半结构化放 MongoDB，统计报表放 MySQL，热点读走 Memurai，体现分工而非单库万能 |
        | 高并发演示 | 用缓存命中与压测脚本量化「加一层缓存」带来的延迟与吞吐变化（教学演示向） |
        | 分析展示 | 词频回答「谁更常被提到」，ItemCF 回答「与谁经常同语境出现」，前端汇总关键指标 |
  - type: gallery
    title: 界面截图
    images:
      - /api/media/files/film/projects/hltv-news-title-crawler\exp.1.png
      - /api/media/files/film/projects/hltv-news-title-crawler\exp.2.3.png
  - type: markdown
    title: 开发回顾
    body: |
        ### 1. PySpark 与 Java 版本不兼容

        **现象**：在较高版本 Java（如 25）下运行 Spark 时出现不稳定或启动即报错。  
        **原因**：Spark 3.5 与发行版 JDK 的兼容矩阵集中在 **Java 17 / 21** 一类 LTS；过新版本尚未被官方充分验证。  
        **处理**：预处理脚本中增加 Java 主版本检查；本机将 `JAVA_HOME` 固定到 **JDK 17**，并保证 `Path` 中 `java` 优先命中该版本。

        ### 2. Windows 缺少 Hadoop 本地组件（`winutils.exe`）

        **现象**：日志中出现 `HADOOP_HOME and hadoop.home.dir are unset`、`Did not find winutils.exe`，或在写出 Parquet/JSON 时失败；部分场景还出现 `NativeIO$Windows` 相关错误。  
        **原因**：Spark 通过 Hadoop 文件系统 API 写本地目录时，在 Windows 上依赖 `winutils.exe` 与 `HADOOP_HOME` 做权限等行为模拟；未配置时本地文件提交易失败。  
        **处理**：安装与 Spark 内置 Hadoop 大版本匹配的 `winutils`，设置 `HADOOP_HOME` 与 `hadoop.home.dir`，并把 `bin` 加入 `Path`；可选设置 `SPARK_LOCAL_DIRS` 指向本地临时目录。读 JSON 时对 **glob 展开为文件列表**，减少对 Windows glob 路径的敏感依赖。

        ### 3. `df.rdd.isEmpty()` 触发 Python worker 崩溃

        **现象**：`Python worker exited unexpectedly`、`EOFException`。  
        **原因**：在部分 Windows + Python 版本组合下，RDD 触发的 Python worker 路径较脆弱。  
        **处理**：将空数据判断改为 **`df.limit(1).count() == 0`** 等 DataFrame 侧逻辑，避免不必要的 RDD worker 路径。

        ### 4. MySQL 导入脚本读取 Parquet 失败

        **现象**：`mysql_import_spark.py` 使用 `spark.read.parquet` 时出现 `NativeIO$Windows.access0` 等错误。  
        **原因**：与上类似，Spark 在 Windows 上枚举/访问本地 Parquet 目录时仍走 Hadoop 本地 IO，环境不齐时易失败。  
        **处理**：导入脚本**默认改为读取预处理产出的 JSON 行文件**（`cleaned_news_json/part-*.json`），用纯 Python 聚合后写 MySQL；仅在使用者显式指定 Parquet 模式时才启 Spark。

        ### 5. 预处理报告中文乱码与前端显示为 `-`

        **现象**：`preprocess_report.txt` 中标题类中文变成 `?`，前端按中文标签解析不到数字。  
        **原因**：部分终端或保存链路编码与 UTF-8 不一致，导致报告中文字符损坏；前端严格按标签字符串匹配。  
        **处理**：报告正文改为**稳定英文标签**；前端增加**按行末数字的兜底解析**，兼容旧报告。

        ### 6. `players` 中的业务噪声词

        **现象**：如 `Sources`、`CS2`、`S2`、`Dust2` 等被标题规则误记入 `players`。  
        **原因**：规则抽取难以区分「游戏/地图/版本泛词」与真实选手昵称。  
        **处理**：集中维护 `src/player_noise.py` 与 `data/ignore_words.txt`；Spark 清洗、词频与 ItemCF 训练侧**统一按大小写不敏感**剔除；爬虫侧忽略词减少后续再出现。

        ### 7. 依赖安装 SSL 证书错误（环境相关）

        **现象**：`pip install` 报 `SSLCertVerificationError`。  
        **原因**：本机或代理对 PyPI 证书链校验失败。  
        **处理**：对 `pip` 使用 `--trusted-host pypi.org --trusted-host files.pythonhosted.org`（或修复系统/代理证书）；并使用 **Python 3.13 官方 Windows 安装** 创建 `.venv_win`，保证 `playwright` 等有对应 wheel。
  - type: markdown
    title: 小结
    body: |
        本项目把 **采集、大数据预处理、多模存储、缓存与推荐、词频与可视化** 串成一条可演示的闭环；主要工程难点集中在 **Windows 上 Spark/Java/Hadoop 本地环境** 与 **实体抽取噪声**，通过版本固定、补齐 Hadoop 工具、读写路径策略与词表多层治理逐一化解。若部署到 Linux 或集群环境，同类问题会显著减少，但数据质量与词表维护仍是长期课题。
related_posts: []
---

正文区域当前版本**不会写入数据库**；项目展示内容以 `layout` 为准。
