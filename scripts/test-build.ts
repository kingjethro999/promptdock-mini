import { complete, extractJson } from "../lib/ai";
import { BUILD_SYSTEM_PROMPT, buildBuildUserMessage } from "../lib/prompts/build";

interface Case {
  name: string;
  thought: string;
  fields: { label: string; value: string; provenance: string }[];
  answers: string[];
}

const CASES: Case[] = [
  {
    name: "lending-tracker",
    thought: "I want an app for tracking stuff I lend people because I always forget who has what",
    fields: [
      { label: "Goal", value: "Keep a record of items I've lent so I remember who has them", provenance: "known" },
      { label: "Who it's for", value: "Just me, possibly my sister and roommate later", provenance: "inferred" },
      { label: "Format", value: "A simple mobile-first web app", provenance: "inferred" },
      { label: "Must haves", value: "Add an item with who has it; mark it returned; see what's out", provenance: "known" },
      { label: "Success looks like", value: "I can check in seconds whether someone still has my drill", provenance: "inferred" },
    ],
    answers: [],
  },
  {
    name: "football-trial-with-answers",
    thought: "prepare me for my football trial",
    fields: [
      { label: "Goal", value: "Arrive at the trial ready to perform", provenance: "known" },
      { label: "Timeline", value: "Two weeks before the trial", provenance: "known" },
      { label: "Preparation areas", value: "Fitness, first touch, finishing, and a short warm-up routine", provenance: "inferred" },
      { label: "Format", value: "A day-by-day training plan", provenance: "inferred" },
    ],
    answers: ["Two weeks, I'm a winger, trial is with a semi-pro club."],
  },
  {
    name: "junk-letters",
    thought: "asdf",
    fields: [{ label: "Input", value: "The thought is only 'asdf' — nothing concrete to work from yet", provenance: "known" }],
    answers: [],
  },
];

const PREAMBLE = /^(sure|here(?:'s| is)|certainly|of course|absolutely|as an ai|i(?:'ve| have) prepared|below is|this is your)/i;

let failures = 0;

function fail(name: string, message: string): void {
  failures += 1;
  console.error(`  FAIL [${name}] ${message}`);
}

async function main(): Promise<void> {
  for (const testCase of CASES) {
    const user = buildBuildUserMessage(testCase);
    const result = await complete(BUILD_SYSTEM_PROMPT, user, {});
    const prompt = result.text.trim();
    console.log(`── ${testCase.name} ── (${result.provider}/${result.model}, ${result.latencyMs}ms, ${prompt.length} chars)`);

    if (prompt.length < 60) fail(testCase.name, `too short to be a usable prompt (${prompt.length} chars)`);
    if (PREAMBLE.test(prompt)) fail(testCase.name, `starts with a chat preamble: "${prompt.slice(0, 60)}"`);
    if (/^\s*```/.test(prompt) && prompt.startsWith("```")) {
      fail(testCase.name, "prompt is wrapped in a code fence");
    }
    if (/\bprovenance\b|\bknown\b\s*[:|]\s*(true|false)/i.test(prompt)) {
      fail(testCase.name, "leaks interpretation internals (provenance)");
    }
    if (/\bchips?\b|\bfields\b.*(labeled|returned)|shape(d)? by/i.test(prompt)) {
      fail(testCase.name, "references the shaping process");
    }
    if (prompt.split(/\s+/).length > 450) fail(testCase.name, "bloated (>450 words)");

    console.log(`  starts: "${prompt.slice(0, 90).replace(/\s+/g, " ")}…"`);
    if (testCase.name === "football-trial-with-answers" && !/two weeks/i.test(prompt)) {
      fail(testCase.name, "dropped the answered timeline");
    }
    if (testCase.name === "lending-tracker" && !/lend|lent|loan|borrow/i.test(prompt)) {
      fail(testCase.name, "lost the lending subject");
    }
    console.log();
  }

  void extractJson;
  if (failures > 0) {
    console.error(`${failures} build violation(s)`);
    process.exit(1);
  }
  console.log("build prompt contract holds for all cases");
}

void main();
