/**
 * AIGraph — LLM Verification Test Script
 *
 * هدف: تست کیفیت خروجی prompt verification (بخش ۳ سند ai-talent-graph-plan.md)
 * روی چند repo واقعی، قبل از commit به provider خاص.
 *
 * قبل از اجرا:
 *   1. یه فایل .env.local بساز (کنار همین فایل) با محتوای:
 *        AI_HA_API_KEY=your-key-here
 *        AI_HA_BASE_URL=https://api.ai-ha.ir/v1   <-- این رو با base URL واقعی AI-ha جایگزین کن
 *        AI_HA_MODEL=gpt-4o                        <-- یا مدل واقعی که AI-ha ارائه می‌ده
 *   2. .env.local رو به .gitignore اضافه کن (نباید commit بشه)
 *   3. اجرا: node test-verification.mjs
 *
 * نکته: این script فرض می‌کنه AI-ha یه API سازگار با فرمت OpenAI Chat Completions داره
 * (که اکثر proxy های ایرانی این‌طوری‌ان). اگه فرمت متفاوت بود، فقط تابع callLLM
 * رو باید عوض کنی — بقیه‌ی script دست‌نخورده می‌مونه.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- بارگذاری .env.local به‌صورت دستی (بدون dependency اضافه) ----------
function loadEnv(path) {
  if (!existsSync(path)) {
    console.error(`❌ فایل .env.local پیدا نشد: ${path}`);
    console.error('   یه فایل .env.local بساز با AI_HA_API_KEY، AI_HA_BASE_URL، AI_HA_MODEL');
    process.exit(1);
  }
  const content = readFileSync(path, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv(join(__dirname, '.env.local'));

const API_KEY = env.AI_HA_API_KEY;
const BASE_URL = env.AI_HA_BASE_URL || 'https://api.ai-ha.ir/v1';
const MODEL = env.AI_HA_MODEL || 'gpt-4o';

if (!API_KEY) {
  console.error('❌ AI_HA_API_KEY تو .env.local پیدا نشد.');
  process.exit(1);
}

// ---------- ۳ repo واقعی برای تست (public، متنوع از نظر زبان و کیفیت) ----------
const TEST_REPOS = [
  {
    name: 'vercel/swr',
    claimedSkills: ['React', 'TypeScript', 'Hooks'],
  },
  {
    name: 'tiangolo/fastapi',
    claimedSkills: ['Python', 'FastAPI', 'REST API'],
  },
  {
    name: 'sindresorhus/is-online',
    claimedSkills: ['JavaScript', 'Node.js', 'Networking', 'Machine Learning'], // یکی از این‌ها عمداً غلطه (Machine Learning) برای تست دقت مدل
  },
];

// ---------- گرفتن metadata از GitHub (بدون نیاز به توکن، rate limit پایین ولی کافی برای تست) ----------
async function fetchGithubMetadata(repoFullName) {
  const repoRes = await fetch(`https://api.github.com/repos/${repoFullName}`);
  if (!repoRes.ok) throw new Error(`GitHub API error برای ${repoFullName}: ${repoRes.status}`);
  const repoData = await repoRes.json();

  let readme = '';
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${repoFullName}/readme`, {
      headers: { Accept: 'application/vnd.github.raw+json' },
    });
    if (readmeRes.ok) readme = (await readmeRes.text()).slice(0, 3000);
  } catch {
    readme = '(README در دسترس نبود)';
  }

  const langRes = await fetch(`https://api.github.com/repos/${repoFullName}/languages`);
  const languages = langRes.ok ? Object.keys(await langRes.json()).slice(0, 5) : [];

  return {
    name: repoData.name,
    description: repoData.description || '',
    languages,
    stars: repoData.stargazers_count,
    readme,
  };
}

// ---------- ساخت prompt (طبق بخش ۳ سند ai-talent-graph-plan.md) ----------
function buildVerificationPrompt(metadata, claimedSkills) {
  return `You are a skill verification system for an AI talent platform.

You will receive a GitHub repository's metadata and a list of skills the developer claims they used in this project. Your job: analyze whether the evidence in the repository supports each claim.

Repository metadata:
- Name: ${metadata.name}
- Description: ${metadata.description}
- Primary languages: ${metadata.languages.join(', ')}
- Star count: ${metadata.stars}
- README (first 3000 chars):
${metadata.readme}

Developer's claimed skills for this project:
${claimedSkills.map((s) => `- ${s.toLowerCase().replace(/\s+/g, '-')}`).join('\n')}

For each claimed skill, return a verdict. Be STRICT — only verify if there is direct, visible evidence in the README, file structure, languages, or commits. Do NOT verify based on assumption or inference from project type alone.

Output STRICT JSON with this exact shape:
{
  "verifications": [
    {
      "skill_slug": "string (must match input slug exactly)",
      "confidence": 0.0,
      "evidence": "1-2 sentence explanation citing specific files/text from the repo",
      "verdict": "verified" | "insufficient"
    }
  ],
  "summary": "1 sentence overall assessment of project quality and skill alignment"
}

Rules:
- confidence >= 0.7 → verdict: "verified"
- confidence < 0.7 → verdict: "insufficient"
- If a claimed skill has zero evidence, set confidence to 0.0 and explain
- If the README is missing or empty, lower all confidence by 0.2
- Do NOT add skills the developer didn't claim
- Output ONLY valid JSON, no markdown fences, no preamble`;
}

// ---------- صدا زدن AI-ha (فرمت OpenAI-compatible) ----------
async function callLLM(prompt) {
  const start = Date.now();

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('پاسخ خالی یا فرمت غیرمنتظره از LLM برگشت');

  return { content, latencyMs };
}

// ---------- پارس و اعتبارسنجی JSON خروجی ----------
function parseAndValidate(raw) {
  let cleaned = raw.trim();
  // اگه مدل markdown fence دور JSON گذاشته باشه، پاکش کن
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return { valid: false, error: 'JSON parse failed', raw: cleaned };
  }

  if (!Array.isArray(parsed.verifications)) {
    return { valid: false, error: 'فیلد verifications آرایه نیست', raw: parsed };
  }

  for (const v of parsed.verifications) {
    if (typeof v.skill_slug !== 'string') return { valid: false, error: 'skill_slug نامعتبر', raw: v };
    if (typeof v.confidence !== 'number' || v.confidence < 0 || v.confidence > 1)
      return { valid: false, error: 'confidence نامعتبر', raw: v };
    if (!['verified', 'insufficient'].includes(v.verdict))
      return { valid: false, error: 'verdict نامعتبر', raw: v };
  }

  return { valid: true, data: parsed };
}

// ---------- اجرای تست روی همه‌ی repo ها ----------
async function runTests() {
  console.log(`\n🔧 Provider: AI-ha | Model: ${MODEL} | Base URL: ${BASE_URL}\n`);
  console.log('='.repeat(70));

  const results = [];

  for (const repo of TEST_REPOS) {
    console.log(`\n📦 Testing: ${repo.name}`);
    console.log(`   Claimed skills: ${repo.claimedSkills.join(', ')}`);

    try {
      const metadata = await fetchGithubMetadata(repo.name);
      const prompt = buildVerificationPrompt(metadata, repo.claimedSkills);
      const { content, latencyMs } = await callLLM(prompt);
      const validation = parseAndValidate(content);

      if (!validation.valid) {
        console.log(`   ❌ FAIL — ${validation.error}`);
        console.log(`   Raw output: ${JSON.stringify(validation.raw).slice(0, 300)}`);
        results.push({ repo: repo.name, pass: false, latencyMs, reason: validation.error });
        continue;
      }

      console.log(`   ✅ Valid JSON | Latency: ${latencyMs}ms`);
      console.log(`   Summary: ${validation.data.summary}`);
      for (const v of validation.data.verifications) {
        const icon = v.verdict === 'verified' ? '✓' : '✗';
        console.log(`   ${icon} ${v.skill_slug} (${v.confidence.toFixed(2)}) — ${v.evidence}`);
      }

      results.push({ repo: repo.name, pass: true, latencyMs, verifications: validation.data.verifications });
    } catch (err) {
      console.log(`   ❌ ERROR — ${err.message}`);
      results.push({ repo: repo.name, pass: false, reason: err.message });
    }

    console.log('-'.repeat(70));
  }

  // ---------- جمع‌بندی نهایی ----------
  console.log('\n📊 خلاصه‌ی نتایج:\n');
  const passCount = results.filter((r) => r.pass).length;
  const avgLatency =
    results.filter((r) => r.latencyMs).reduce((sum, r) => sum + r.latencyMs, 0) /
    (results.filter((r) => r.latencyMs).length || 1);

  console.log(`   Pass rate: ${passCount}/${results.length}`);
  console.log(`   میانگین latency: ${Math.round(avgLatency)}ms`);
  console.log(`   ${avgLatency < 10000 ? '✅' : '⚠️'} معیار پذیرش (زیر ۱۰ ثانیه): ${avgLatency < 10000 ? 'قبول' : 'رد — provider جایگزین رو تست کن'}`);
  console.log(`   ${passCount === results.length ? '✅' : '⚠️'} معیار پذیرش (همه JSON معتبر): ${passCount === results.length ? 'قبول' : 'رد'}`);

  console.log('\n💡 نکته: به سومین repo (sindresorhus/is-online) دقت کن —');
  console.log('   یکی از skill های claim شده (Machine Learning) عمداً غلطه.');
  console.log('   اگه مدل اون رو هم "verified" اعلام کرد، یعنی prompt به‌اندازه‌ی کافی strict نیست.\n');
}

runTests().catch((err) => {
  console.error('❌ خطای غیرمنتظره:', err);
  process.exit(1);
});
