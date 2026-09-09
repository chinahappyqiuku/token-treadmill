#!/usr/bin/env node
/**
 * Token Treadmill command-line burner.
 * Requires Node.js 18+ (native fetch).
 *
 * Example:
 * TOKEN_API_KEY=sk-... node burn.mjs \
 *   --endpoint https://api.openai.com/v1/chat/completions \
 *   --model deepseek-chat --target 1000000 --max-output 256
 */

const args = process.argv.slice(2);
const value = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const number = (name, fallback) => {
  const n = Number(value(name, fallback));
  return Number.isFinite(n) ? n : fallback;
};
const endpointInput = value('endpoint', process.env.TOKEN_API_ENDPOINT || '');
const apiKey = process.env.TOKEN_API_KEY || value('api-key');
const model = value('model', process.env.TOKEN_MODEL || 'gpt-4o-mini');
const target = Math.max(1_000_000, Math.min(1_000_000_000, number('target', 1_000_000)));
const maxOutput = Math.max(1, Math.min(8_192, number('max-output', 256)));
const concurrency = Math.max(1, Math.min(8, number('concurrency', 1)));
const price = Math.max(0, number('price', 0));
const auth = value('auth', 'bearer').toLowerCase();
const prompt = value('prompt', '请严肃地输出一段没有实际结论的职场洞察，结尾加一句：本轮 token 消耗具有战略意义。');

if (!endpointInput || !apiKey) {
  console.error('缺少配置：请提供 --endpoint，并通过 TOKEN_API_KEY 环境变量或 --api-key 传入密钥。');
  process.exit(2);
}

const endpoint = /\/chat\/completions\/?$/i.test(endpointInput)
  ? endpointInput
  : `${endpointInput.replace(/\/$/, '')}/chat/completions`;
let total = 0;
let promptTokens = 0;
let completionTokens = 0;
let calls = 0;
let stopping = false;
let interrupted = false;
let failedRun = false;
const controllers = new Set();

process.on('SIGINT', () => {
  stopping = true;
  interrupted = true;
  controllers.forEach((controller) => controller.abort('interrupt'));
  console.log('\n收到停止信号，等待当前请求结束…');
});

function usageOf(data) {
  const usage = data?.usage;
  if (!usage || typeof usage !== 'object') {
    throw new Error('服务商响应缺少 usage，已停止以避免无法计量的消耗');
  }
  const input = Number(usage.prompt_tokens ?? usage.input_tokens);
  const output = Number(usage.completion_tokens ?? usage.output_tokens);
  const sum = Number(usage.total_tokens ?? input + output);
  if (!Number.isFinite(input) || !Number.isFinite(output) || !Number.isFinite(sum) || input < 0 || output < 0 || sum <= 0) {
    throw new Error('服务商返回的 usage 无效，已停止以避免统计失真');
  }
  return {
    input,
    output,
    total: sum,
  };
}

async function request(sequence, requestMax) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth === 'api-key') headers['api-key'] = apiKey;
  else headers.Authorization = `Bearer ${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), 60_000);
  controllers.add(controller);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: `${prompt}\n\n[消耗批次 ${sequence} · 请完整输出，不要省略]` }],
        max_tokens: requestMax,
        temperature: 1,
      }),
      signal: controller.signal,
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error(`HTTP ${response.status}，返回内容不是 JSON`); }
    if (!response.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
    return usageOf(data);
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason === 'timeout') throw new Error('请求超过 60 秒仍未完成，已停止');
    throw error;
  } finally {
    clearTimeout(timeout);
    controllers.delete(controller);
  }
}

console.log(`Token Treadmill · 目标 ${target.toLocaleString()} tokens · 并发 ${concurrency}`);
console.log(`Endpoint: ${endpoint}`);

while (!stopping && total < target) {
  const remaining = target - total;
  const batchSize = Math.min(concurrency, Math.max(1, Math.ceil(remaining / maxOutput)));
  const requestMax = Math.max(1, Math.min(maxOutput, Math.floor(remaining / batchSize) || 1));
  const batch = await Promise.allSettled(
    Array.from({ length: batchSize }, () => request(calls + 1, requestMax)),
  );
  let failed = false;
  for (const result of batch) {
    if (result.status === 'rejected') {
      if (result.reason?.name !== 'AbortError') console.error(`请求失败：${result.reason?.message || result.reason}`);
      if (!interrupted) failedRun = true;
      failed = true;
      continue;
    }
    const usage = result.value;
    calls += 1;
    total += usage.total;
    promptTokens += usage.input;
    completionTokens += usage.output;
    const estimated = price ? ` · 估算 $${((total / 1000) * price).toFixed(4)}` : '';
    console.log(`#${calls} +${usage.total} tokens（输入 ${usage.input} / 输出 ${usage.output}） · 合计 ${total}${estimated}`);
  }
  if (failed) stopping = true;
}

console.log(stopping && total < target ? '已停止，未继续发送新请求。' : '目标已达成，自动刹车。');
console.log(`请求 ${calls} 次 · 输入 ${promptTokens} · 输出 ${completionTokens} · 总计 ${total} tokens`);
process.exitCode = interrupted ? 130 : (failedRun ? 1 : 0);
