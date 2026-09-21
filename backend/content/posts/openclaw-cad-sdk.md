## 要解决什么

OpenClaw（龙虾）能写代码、调工具，但默认够不到本机 CAD 里的图纸。实际场景往往是：已经打开一张 DWG，想让助手「按文字模糊找到某个标注 / 图元，再缩放到视野里」。

仓库 [CAD-SDK-for-OpenClaw](https://github.com/Grunray/CAD-SDK-for-OpenClaw) 做的就是这件事：在 CAD 进程内嵌 .NET 插件，起一个本机 HTTP 服务；旁边再挂一套 skill 脚本，用 curl / PowerShell 打接口。公开仓库大致从 **2026-05-24** 起步，到 **2026-05-30** 前后把主线能力收齐。

| 平台 | CAD 宿主 |
|------|----------|
| Windows | AutoCAD 2025 / 2026 |
| Linux（UOS / 麒麟 x86_64） | 中望 CAD Linux 2026 |

## 能力边界

最小工具集刻意压得很窄：

1. **开图** — `POST /document/open`，或 ensure 脚本冷启动 CAD 并 `NETLOAD`
2. **模糊定位** — `GET /find?q=关键字`，扫文字 / 多行文字 / 属性
3. **视图缩放** — `/zoom/to`、`/zoom/by`、`/zoom/extents`

默认监听本机端口 **54321**。skill 侧常见流程是：先 `/ping`，不通就跑 `ensure_autocad_ready` 拉起宿主；再 `open_dwg`，然后才找字、缩放。

## 架构怎么选

```text
OpenClaw skill  ──HTTP(localhost)──►  CAD 主进程
                                      └─ CoalClaw.Cad.Core（自托管 HTTP）
                                         + AutoCAD / ZwCAD 适配层
```

几点取舍：

- **走 HTTP self-host，不走文件 IPC。** 调试直观，也方便 skill 用现成 curl。
- **HTTP 回调线程拿不到 `MdiActiveDocument`。** 必须落到文档锁 / `WorkingDatabase` 那一套，否则一碰数据库就崩。
- **插件常驻，skill 不改注册表做永久注入。** 端口不通时优先 ensure 脚本，不静默改系统配置。

实现上拆成 Abstractions / Core / AutoCAD.Plugin / ZwCAD.Plugin：Core 管路由与 JSON，两端插件各自接宿主 API。目标框架优先 **.NET 8**（对齐 AutoCAD 2025/2026）；需要更老宿主时再考虑 `net472`。

## 模糊匹配与缩放

找字没有现成库，套路很朴素：遍历模型空间（及块引用），取 `DBText` / `MText` / 属性文本，先子串忽略大小写，再按相似度排序取前几条。大图以后才值得考虑离线 FTS。

缩放到实体用 `ViewTableRecord` 设中心与宽高；Paperspace 要单独处理当前视口。仓库 README 里保留了可抄的骨架，也标了 DocumentLock + Transaction 的铁律。

## 和「直接挂 MCP」的差别

调研阶段也看过纯 Python + AutoLISP 的 MCP 方案：半天能验证 zoom，但技术栈和本仓库的 .NET 单栈目标不一致。这里选的是 **脚手架（gileCAD R25 / ADN 向导）+ Minimal API + skill wrapper**，大约几天内能做出可演示的 MVP，换来的是端口契约、双宿主适配和后续自己控代码。

## 仓库入口

- 源码与文档：[github.com/Grunray/CAD-SDK-for-OpenClaw](https://github.com/Grunray/CAD-SDK-for-OpenClaw)
- 安装说明：`docs/setup-windows.md`、`docs/setup-linux-zwcad.md`
- 接口约定：`docs/api-contract.md`
- skill：`skill/openclaw-autocad/`

适合「本机已经装了 CAD、希望 OpenClaw 能指着图纸说话」的场景；它不负责解析 DWG 语义本身，只负责把宿主里的定位与视图操作暴露出去。