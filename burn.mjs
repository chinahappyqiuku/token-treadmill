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

process.on('SIGINT', () => {
  stopping = true;
  console.log('\n收到停止信号，等待当前请求结束…');
});

function usageOf(data) {
  const usage = data?.usage || {};
  const input = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
  const output = Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
  const sum = Number(usage.total_tokens ?? input + output);
  return {
    input: Number.isFinite(input) ? input : 0,
    output: Number.isFinite(output) ? output : 0,
    total: Number.isFinite(sum) ? sum : input + output,
  };
}

async function request(sequence) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth === 'api-key') headers['api-key'] = apiKey;
  else headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: `${prompt}\n\n[消耗批次 ${sequence} · 请完整输出，不要省略]` }],
      max_tokens: maxOutput,
      temperature: 1,
    }),
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error(`HTTP ${response.status}，返回内容不是 JSON`); }
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
  return usageOf(data);
}

console.log(`Token Treadmill · 目标 ${target.toLocaleString()} tokens · 并发 ${concurrency}`);
console.log(`Endpoint: ${endpoint}`);

while (!stopping && total < target) {
  const remaining = target - total;
  const batchSize = Math.min(concurrency, Math.max(1, Math.ceil(remaining / maxOutput)));
  const batch = await Promise.all(
    Array.from({ length: batchSize }, () => request(calls + 1)),
  );
  for (const usage of batch) {
    calls += 1;
    total += usage.total;
    promptTokens += usage.input;
    completionTokens += usage.output;
    const estimated = price ? ` · 估算 $${((total / 1000) * price).toFixed(4)}` : '';
    console.log(`#${calls} +${usage.total} tokens（输入 ${usage.input} / 输出 ${usage.output}） · 合计 ${total}${estimated}`);
  }
}

console.log(stopping ? '已停止。' : '目标已达成，自动刹车。');
console.log(`请求 ${calls} 次 · 输入 ${promptTokens} · 输出 ${completionTokens} · 总计 ${total} tokens`);
