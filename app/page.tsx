"use client";

import { useState } from "react";
import { ThoughtInput } from "../components/ThoughtInput";

export default function Home() {
  const [thought, setThought] = useState("");
  const [busy, setBusy] = useState(false);

  function handleSubmit(next: string) {
    // Wired to POST /api/shape in slice 4.
    void next;
    setBusy(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-fg">
          Drop the rough version of the idea here.
        </h1>
        <p className="text-sm text-muted">
          Half a sentence is fine. You will shape it next.
        </p>
      </section>

      <ThoughtInput value={thought} onChange={setThought} onSubmit={handleSubmit} busy={busy} />
    </main>
  );
}
