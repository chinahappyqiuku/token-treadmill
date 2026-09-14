# Token Treadmill · Real Token Consumption Experiment / 真实 Token 消耗实验

> **English**
> A production-minded, measurable real-request token-consumption experiment for OpenAI-compatible APIs. Configure a target, concurrency, model, and budget signal, then observe real usage with explicit safety guardrails.
>
> **中文**
> 一个面向 OpenAI 兼容接口的真实 Token 消耗工程实验：可配置目标、并发、模型和成本提示，读取真实用量，并用明确的安全边界控制实验。

> This is an engineering experiment, not an employee-monitoring or performance-evaluation system.
>
> 这是工程实验，不是员工监控或绩效考核工具。

## Overview / 项目简介

**English**

Token Treadmill turns the idea that “more tokens means more effort” into a controllable experiment. It sends real Chat Completions requests, reads the provider’s usage fields, estimates cost when prices are supplied, and stops when the target is reached or a safety condition fails. The project is intentionally zero-dependency and works as a static page, GitHub Pages site, or Node.js CLI.

**中文**

Token Treadmill 把“用量等于努力”的荒诞逻辑做成可观察的工程实验：真实发送 Chat Completions 请求，读取服务商返回的 usage，填写单价后估算费用，达到目标或触发安全条件时停止。项目零依赖，可作为静态页面、GitHub Pages 网站或 Node.js 命令行工具运行。

## Features / 核心功能

- **Real requests / 真实请求**：标准 POST /chat/completions，支持 Authorization: Bearer 和 api-key 认证头。
- **Provider presets / 模型预设**：DeepSeek、Qwen、智谱 GLM、MiniMax、腾讯混元；地址和模型名均可修改。
- **Configurable burn / 可控消耗**：目标总 tokens 为 1,000,000–1,000,000,000；单次最大输出和并发数 1–8 可配置。
- **Usage accounting / 真实计量**：统计 prompt_tokens、completion_tokens、total_tokens，并兼容 input_tokens / output_tokens。
- **Fail-safe accounting / 计量失败即停止**：没有有效 usage、请求错误或超时都会停止，不会把未知用量当成 0。
- **Cost estimation / 成本提示**：填写输入、输出单价后实时估算费用；不填或填 0 则只展示用量。
- **In-memory secret / 内存密钥**：浏览器端 API Key 只存在当前页面内存，不写入仓库、Cookie 或 localStorage。

## Quick start / 快速开始

1. Open index.html, or serve the repository with a static server. / 打开 index.html，或使用静态服务器运行。
2. Enter a complete Chat Completions endpoint, for example https://api.openai.com/v1/chat/completions. / 填入完整接口地址。
3. Choose a preset or enter a model manually, then set the target tokens and price hints. / 选择预设或手动填写模型、目标 tokens 和单价。
4. Start the experiment and watch the log for provider-reported usage. / 开始实验，查看日志中的真实用量。

Use a small target first. In-flight concurrent requests cannot be recalled, so the final total can slightly exceed the target; concurrency 1 and a smaller max output keep the stop line closer.

建议先使用较小目标。已经发出的并发请求无法撤回，因此最终用量可能略高于目标；使用并发 1 和较小的单次最大输出会更接近停止线。

## Local run / 本地运行

Double-click index.html, or start a local server:

~~~bash
python -m http.server 8000
~~~

Then open http://localhost:8000. / 然后打开 http://localhost:8000。

## GitHub Pages

Upload index.html, burn.mjs, README.md, .gitignore, .env.example, and LICENSE. In Settings → Pages choose Deploy from a branch, branch main, and folder / (root).

上传上述文件后，在 Settings → Pages 中选择 Deploy from a branch、main 和 / (root)。GitHub Pages 是公开静态页面，页面中的密钥只会从浏览器发送到你填写的 API 地址。

## CLI / 命令行版本

Node.js 18+ includes fetch. Keep the key in an environment variable:

~~~bash
TOKEN_API_KEY=sk-... node burn.mjs --endpoint https://api.openai.com/v1/chat/completions --model deepseek-chat --target 1000000 --max-output 256 --concurrency 1
~~~

The CLI supports targets from 1,000,000 to 1,000,000,000 and can switch authentication with --auth api-key. Invalid usage, request errors, and timeouts stop the process and return a non-zero exit code for scripts and CI.

Node.js 18+ 自带 fetch；CLI 支持 1,000,000 到 1,000,000,000 的目标，并可用 --auth api-key 切换认证头。遇到无效 usage、请求错误或超时会停止并返回非零退出码，便于脚本和 CI 识别失败。

## Safety and cost / 安全与费用

This tool sends real requests and can spend real account credits. Use only your own API key, start small, confirm the model and prices, and follow the provider’s terms. Never place a key in a URL, screenshot, commit, or public issue. Different providers may bill input, output, cached, or reasoning tokens differently; the provider console is the source of truth.

这是会发出真实请求的工具，不是模拟器，可能产生真实账单。请只使用自己的 API Key，先设置小目标，确认模型和单价并遵守服务商条款。不要把密钥写进 URL、截图、提交或公开 Issue；最终费用以服务商控制台为准。

The project is intentionally not a monitoring or performance score. Token counts describe processed text, not the value, difficulty, quality, or human effort behind work. / 本项目不用于员工监控或绩效评分；Token 数量只能描述处理了多少文本，不能证明工作的价值、难度、质量或人的投入程度。

## License / 许可证

MIT
