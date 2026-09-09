# Token Treadmill · 真实 Token 消耗器

> 一本正经做抽象：如果未来的绩效表只剩下 token 用量，提前练习浪费，就是一种未雨绸缪。

## 创立初衷与背景

未来，AI 可能会像办公软件、代码编辑器和协作平台一样参与日常工作。无论员工使用哪一个 agent、模型或代码工具，管理者都可能尝试用每天消耗的 tokens 来判断工作状态：消耗得越多，就被解释为越认真、效率越高；消耗得越少，就被怀疑在摸鱼。

Token Treadmill 由这个一本正经的假设出发。它把“用量等于努力”的荒诞逻辑做成一个真的会发送请求、真的读取 `usage`、真的产生费用的实验工具：如果未来的绩效制度只剩下 token 仪表盘，我们至少可以先把这套仪表盘运行起来，再观察它有多荒谬。

这也是一个带有讽刺意味的工程实验，而不是员工监控或绩效考核方案。tokens 只能说明模型处理了多少文本，不能证明工作的价值、难度、质量或人的投入程度。任何组织如果把它用于管理决策，都应该同时考虑成果、上下文、隐私、误报和员工知情同意。

Token Treadmill 是一个零依赖的真实 token 消耗工具。输入 OpenAI 兼容接口地址、API Key 和模型，它会重复发起 Chat Completions 请求，读取服务商返回的 `usage`，直到达到目标或你按下停止。

## 功能

- **真实请求**：标准 `POST /chat/completions`，支持 `Authorization: Bearer` 和 `api-key` 两种常见认证头。
- **国产模型预设**：DeepSeek（`deepseek-chat`）、Qwen 通义千问（`qwen-plus`）、智谱 GLM（`glm-4-flash`）、MiniMax（`MiniMax-Text-01`）、腾讯混元（`hunyuan-turbos`）；模型名和地址都可以自行修改。
- **可控消耗**：目标总 tokens 为 100 万–10 亿，单次最大输出、并发数（1–8）都可配置；达到目标会自动刹车。
- **真实计量**：按响应中的 `prompt_tokens`、`completion_tokens`、`total_tokens`（同时兼容 `input_tokens` / `output_tokens`）统计。
- **计量失败即停止**：如果服务商没有返回有效的 `usage`，程序会停止，不会把未知用量当成 0 后继续发送请求。
- **成本提示**：可填写单价，页面实时显示估算费用；不填或填 0 则只显示用量。
- **内存密钥**：API Key 只存在当前页面的 JavaScript 内存中，不写入仓库、Cookie 或 `localStorage`。

## 使用

1. 打开 `index.html`（或用静态服务器运行）。
2. 填入**完整的 Chat Completions 地址**，例如 `https://api.openai.com/v1/chat/completions`。
3. 选择国产模型预设（或手动填写模型名），填入 API Key 和目标 tokens。目标最小为 100 万，建议先确认账户预算。
4. 点击“开始真实消耗”。日志会展示每次请求返回的实际用量。

每个请求有 60 秒超时。并发请求已经发出后无法撤回，因此并发越高，最终用量可能略高于目标；想让停止线更接近目标时，请使用并发 1，并把单次最大输出调小。

任何兼容 OpenAI 请求格式的服务都可以使用，包括自建网关、DeepSeek、阿里云百炼、智谱、MiniMax、腾讯云和本地推理服务。若浏览器提示 CORS，被调用的服务需要允许当前网页来源；也可以改用仓库中的命令行版本。

## 本地运行

直接双击 `index.html` 即可。也可以使用 Node.js 自带的静态服务器或 Python：

```bash
python -m http.server 8000
```

然后打开 <http://localhost:8000>。

## 发布到 GitHub Pages

上传 `index.html`、`burn.mjs`、`README.md`、`.gitignore`、`.env.example` 和 `LICENSE` 后，在仓库的 **Settings → Pages** 选择 `Deploy from a branch`、`main`、`/ (root)`。

## 命令行版本

Node.js 18+ 自带 `fetch`，密钥建议放在环境变量中：

```bash
TOKEN_API_KEY=sk-... node burn.mjs --endpoint https://api.openai.com/v1/chat/completions --model deepseek-chat --target 1000000 --max-output 256 --concurrency 1
```

`--target` 支持 1,000,000 到 1,000,000,000；`--auth api-key` 可切换到 `api-key` 请求头。
CLI 遇到无效 `usage`、请求错误或超时会停止，并返回非零退出码，方便脚本和 CI 识别失败。

PowerShell 可以这样设置密钥：

```powershell
$env:TOKEN_API_KEY = "sk-..."
node burn.mjs --endpoint https://api.openai.com/v1/chat/completions --model deepseek-chat --target 1000000 --max-output 256 --concurrency 1
```

## 安全与费用警告

这是一个会发出真实请求的工具，不是模拟器。每次点击都会消耗你填写的服务商账户额度并可能产生账单；并发越高、目标越大，消耗越快。请只使用自己的 API Key，先设置小目标，确认模型和单价，并遵守服务商条款。

GitHub Pages 是公开静态页面：代码中没有内置任何密钥，但你在页面中输入的密钥会从浏览器发送到你填写的 API 地址。不要把密钥写进 URL、截图或提交到仓库。

页面中的价格和请求次数都是估算值。不同服务商可能按输入、输出、缓存、推理 tokens 或其他计费项分别计价，最终账单以服务商控制台为准。

## License

MIT
