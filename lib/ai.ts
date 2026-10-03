export type ProviderName = "apmix" | "groq" | "gemini";

export interface Completion {
  text: string;
  provider: ProviderName;
  model: string;
  latencyMs: number;
}

export interface ProviderAttempt {
  provider: ProviderName;
  reason: string;
}

export class AiUnavailableError extends Error {
  constructor(public attempts: ProviderAttempt[]) {
    super(`All providers failed: ${attempts.map((a) => `${a.provider} (${a.reason})`).join("; ")}`);
    this.name = "AiUnavailableError";
  }
}

interface ProviderConfig {
  name: ProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULTS: Record<ProviderName, { baseUrl: string; model: string }> = {
  apmix: { baseUrl: "https://api.apmix.ai/v1", model: "deepseek-v4-flash-free" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
};

const KEYS: Record<ProviderName, string> = {
  apmix: "APMIX_API_KEY",
  groq: "GROQ_API_KEY",
  gemini: "GEMINI_API_KEY",
};

function env(name: string, fallback = ""): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export function providerOrder(): ProviderName[] {
  const raw = env("AI_PROVIDER_ORDER", "apmix,groq,gemini");
  const known: ProviderName[] = ["apmix", "groq", "gemini"];
  const requested = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderName => (known as string[]).includes(s));
  const ordered = requested.length > 0 ? requested : known;
  const maxFallbacks = Number(env("AI_MAX_FALLBACKS", "2"));
  const limit = Number.isFinite(maxFallbacks) ? Math.max(0, maxFallbacks) + 1 : 3;
  return ordered.slice(0, limit);
}

function configFor(name: ProviderName): ProviderConfig | null {
  const apiKey = env(KEYS[name]);
  if (!apiKey) return null;
  const baseUrl =
    name === "apmix"
      ? env("APMIX_BASE_URL", DEFAULTS.apmix.baseUrl).replace(/\/$/, "")
      : DEFAULTS[name].baseUrl;
  const model = name === "apmix" ? env("APMIX_MODEL", DEFAULTS.apmix.model)
    : name === "groq" ? env("GROQ_MODEL", DEFAULTS.groq.model)
    : env("GEMINI_MODEL", DEFAULTS.gemini.model);
  return { name, baseUrl, apiKey, model };
}

function requestTimeoutMs(): number {
  const raw = Number(env("AI_REQUEST_TIMEOUT_MS", "12000"));
  return Number.isFinite(raw) && raw > 0 ? raw : 12000;
}

interface ChatBody {
  model: string;
  messages: { role: "system" | "user"; content: string }[];
  response_format?: { type: "json_object" };
}

async function postChat(
  config: ProviderConfig,
  body: ChatBody,
  timeoutMs: number,
): Promise<{ ok: true; content: string } | { ok: false; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      return { ok: false, reason: `HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return { ok: false, reason: "empty completion" };
    }
    return { ok: true, content };
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError"
      ? `timeout after ${timeoutMs}ms`
      : error instanceof Error
        ? error.message
        : String(error);
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pull JSON out of a model response.
 * Observed behaviour (probe-ai): groq honours `response_format`, gemini honours it,
 * apmix accepts it but still wraps output in ```json fences — so strip fences and
 * any surrounding prose before parsing.
 */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end > start) return candidate.slice(start, end + 1);
  return candidate.trim();
}

export interface CompleteOptions {
  timeoutMs?: number;
  json?: boolean;
  providers?: ProviderName[];
}

export async function complete(
  system: string,
  user: string,
  options: CompleteOptions = {},
): Promise<Completion> {
  const timeoutMs = options.timeoutMs ?? requestTimeoutMs();
  const order = options.providers ?? providerOrder();
  const attempts: ProviderAttempt[] = [];

  for (const name of order) {
    const config = configFor(name);
    if (!config) {
      attempts.push({ provider: name, reason: `missing ${KEYS[name]}` });
      continue;
    }
    const body: ChatBody = {
      model: config.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    if (options.json) body.response_format = { type: "json_object" };

    const started = Date.now();
    const result = await postChat(config, body, timeoutMs);
    if (result.ok) {
      return {
        text: result.content,
        provider: config.name,
        model: config.model,
        latencyMs: Date.now() - started,
      };
    }
    attempts.push({ provider: config.name, reason: result.reason });
  }

  throw new AiUnavailableError(attempts);
}
