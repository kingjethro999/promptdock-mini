import { AiUnavailableError, complete, extractJson, ProviderName, providerOrder } from "../lib/ai";

const ALL: ProviderName[] = ["apmix", "groq", "gemini"];

interface ProbeResult {
  provider: ProviderName;
  plainJson: string;
  jsonMode: string;
  parseable: boolean;
}

function summarize(value: string, max = 220): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

async function probePlain(provider: ProviderName): Promise<{ ok: boolean; detail: string }> {
  try {
    const result = await complete(
      "You are a strict JSON machine. Respond with JSON only.",
      'Return exactly this JSON object: {"ok":true,"provider":"<name of your provider>"}',
      { providers: [provider] },
    );
    let parseable = false;
    try {
      const parsed = JSON.parse(extractJson(result.text)) as { ok?: boolean };
      parseable = parsed.ok === true;
    } catch {
      parseable = false;
    }
    return {
      ok: parseable,
      detail: `${result.model} in ${result.latencyMs}ms — ${parseable ? "parseable JSON" : `NOT parseable: ${summarize(result.text)}`}`,
    };
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return { ok: false, detail: error.attempts.map((a) => a.reason).join("; ") };
    }
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function probeJsonMode(provider: ProviderName): Promise<string> {
  try {
    const result = await complete(
      "You are a strict JSON machine. Respond with JSON only.",
      'Return exactly this JSON object: {"ok":true}',
      { providers: [provider], json: true },
    );
    try {
      JSON.parse(extractJson(result.text));
      return "response_format accepted AND extracted JSON parses";
    } catch {
      return `response_format accepted but response unparseable: ${summarize(result.text)}`;
    }
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return `rejected/failed — ${error.attempts.map((a) => a.reason).join("; ")}`;
    }
    return `rejected/failed — ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function probeFallback(): Promise<string> {
  process.env.APMIX_BASE_URL = "https://api.invalid.example/v1";
  process.env.APMIX_API_KEY = process.env.APMIX_API_KEY || "forced-failure";
  try {
    const result = await complete(
      "You are a strict JSON machine. Respond with JSON only.",
      'Return exactly this JSON object: {"ok":true}',
    );
    return `fell through to ${result.provider} (${result.model}) — chain works`;
  } catch (error) {
    return `chain failed entirely: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function main(): Promise<void> {
  console.log(`Provider order: ${providerOrder().join(" → ")} (max ${Number(process.env.AI_MAX_FALLBACKS ?? 2)} fallbacks)\n`);
  const results: ProbeResult[] = [];

  for (const provider of ALL) {
    console.log(`── ${provider} ──`);
    const plain = await probePlain(provider);
    console.log(`  plain:     ${plain.ok ? "PASS" : "FAIL"} — ${plain.detail}`);
    const jsonMode = await probeJsonMode(provider);
    console.log(`  json mode: ${jsonMode}`);
    results.push({ provider, plainJson: plain.detail, jsonMode, parseable: plain.ok });
    console.log();
  }

  console.log(`── forced failure → fallback ──`);
  console.log(`  ${await probeFallback()}\n`);

  const passing = results.filter((r) => r.parseable);
  if (passing.length === 0) {
    console.error("No provider returned parseable JSON.");
    process.exit(1);
  }
  console.log(`PASS: ${passing.map((r) => r.provider).join(", ")} returned parseable JSON.`);
  console.log("Notes:");
  for (const r of results) {
    console.log(`  ${r.provider}: ${r.jsonMode}`);
  }
}

void main();
