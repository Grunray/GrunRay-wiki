## 为什么要拆成两个 skill

音视频转写在 OpenClaw 里很常见：会议录音、口播素材、偶尔还有终端录屏 `.tty`。引擎却分成两路——

- **本地**：隐私优先，Whisper / WhisperX，数据不上云
- **云端**：百炼录音文件识别（Paraformer / Fun-ASR），本机不必扛大模型

两边共用**纪要模板、OpenClaw 交付块、可选落盘 Markdown/Word**；差异只在 ASR 引擎。仓库目录：

- 本地：[huo15-openclaw-asr](https://github.com/Grunray/huo15-skills/tree/main/huo15-openclaw-asr)
- 云端：[huo15-openclaw-asr-bailian](https://github.com/Grunray/huo15-skills/tree/main/huo15-openclaw-asr-bailian)

skill 正文大约在 **2026-05** 写入，**2026-06-01** 前后还有一轮同步修订。

## 怎么选

| 场景 | 用哪个 |
|------|--------|
| 明确要云端 / 百炼 / 阿里云 / 不用本地 Whisper | 云端 skill |
| 本地转写、不上云、Whisper / WhisperX | 本地 skill |
| `.tty` 终端录屏 | **只走本地**（云端不做） |
| 用户没说清楚 | 先问本地还是云端 |

云端路径提交前必须确认：用户同意音频经公网 URL 交给百炼处理。

## 本地路线（Whisper）

总流程：识别输入 → 音视频先用 ffmpeg 抽成中间音频（默认 MP3）→ Whisper 出原文 → **质量自检** → 纪要 → 交付块 → 可选保存。

默认模型是 **`base`**。自检看错译成片、乱码、无意义重复、句意断裂等；问题多就提示升到 `small` / `medium` 再跑，**通过前不定稿纪要**。需要说话人分离时换 WhisperX + diarization（常依赖 HuggingFace token）。

Windows 中文环境下要先设 `PYTHONIOENCODING=utf-8`，否则 Whisper 写 GBK 控制台容易崩。`.tty` 分支跳过 Whisper 质检，直接抽可读文本进纪要。

## 云端路线（百炼）

百炼**只收 HTTP(S) 音频 URL**，不接本地路径或 Base64。标准链路是：

```text
本地文件 → OpenClaw 已有的公网分享工具 → URL → DashScope / Paraformer
```

默认模型 `paraformer-v2`，嘈杂或方言可试 `fun-asr`。支持的音视频格式很多，**不必习惯性先转 MP3**；失败或特殊需求再 ffmpeg。单文件常见上限约 2GB / 12 小时；说话人分离建议更短，且多声道要先混成单声道。

脚本侧用 `transcribe_bailian.py --file-url ...`；密钥只放环境变量 `DASHSCOPE_API_KEY`，不要写进 skill 正文。云端**不做** Whisper 那套模型升级表：任务非 SUCCEEDED 或原文空，就换模型 / 查 URL，不编造纪要。

## 交付约定（两边一致）

无论哪条路，交给龙虾的都是固定结构：原文、纪要、元数据、待判断字段。纪要严格基于已通过检查的原文，不杜撰未出现的信息。可选落盘时再问用户要 Markdown 还是 Word。

## 小结

两套 skill 是分工，不是重复实现：本地保隐私与 `.tty`，云端换算力与方言场景。接 OpenClaw 时按触发词分流即可，不要在本地 skill 里偷偷对接百炼 API。