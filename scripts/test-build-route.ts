import { POST } from "../app/api/build/route";

const GOOD_BODY = {
  thought: "I want an app for tracking stuff I lend people because I always forget who has what.",
  interpretation: {
    fields: [
      { id: "goal", label: "Goal", value: "Track lent items and who has them", provenance: "known" },
      { id: "audience", label: "Audience", value: "Personal use", provenance: "inferred" },
    ],
  },
  answers: [],
};

async function call(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main(): Promise<void> {
  const bad = await call({ thought: "x" });
  check("short thought → 400 invalid_body", bad.status === 400, `HTTP ${bad.status}`);

  const empty = await call({ thought: "a valid thought here" });
  check(
    "nothing to build from → 400 invalid_body",
    empty.status === 400,
    `HTTP ${empty.status}`,
  );

  const keys = {
    APMIX: process.env.APMIX_API_KEY ?? "",
    GROQ: process.env.GROQ_API_KEY ?? "",
    GEMINI: process.env.GEMINI_API_KEY ?? "",
  };
  process.env.APMIX_API_KEY = "";
  process.env.GROQ_API_KEY = "";
  process.env.GEMINI_API_KEY = "";
  try {
    const down = await call(GOOD_BODY);
    const downBody = (await down.json()) as { error?: string };
    check(
      "all providers unavailable → 502 ai_unavailable (no partial prompt)",
      down.status === 502 && downBody.error === "ai_unavailable",
      `HTTP ${down.status} ${JSON.stringify(downBody)}`,
    );
  } finally {
    process.env.APMIX_API_KEY = keys.APMIX;
    process.env.GROQ_API_KEY = keys.GROQ;
    process.env.GEMINI_API_KEY = keys.GEMINI;
  }

  const ok = await call(GOOD_BODY);
  const okBody = (await ok.json()) as { prompt?: string };
  const prompt = okBody.prompt ?? "";
  check("valid build → 200 with a prompt", ok.status === 200, `HTTP ${ok.status}`);
  check("prompt is non-trivial", prompt.trim().length > 80, `${prompt.length} chars`);
  check("prompt has no wrapping fence", !prompt.startsWith("```"));
  check(
    "prompt has no chat preamble",
    !/^(sure|here('s| is)|certainly|absolutely)\b/i.test(prompt.trim()),
    prompt.slice(0, 60),
  );

  console.log(failures === 0 ? "build route holds" : `${failures} failure(s)`);
  process.exit(failures ? 1 : 0);
}

void main();
