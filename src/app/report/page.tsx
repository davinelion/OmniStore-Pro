"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Form() {
  const sp = useSearchParams();
  const [ok, setOk] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/v1/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        appId: fd.get("appId"),
        reason: fd.get("reason"),
        details: fd.get("details"),
      }),
    });
    setOk(true);
  }
  if (ok) return <p>Report received. Thank you.</p>;
  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-lg space-y-3">
      <input name="appId" defaultValue={sp.get("app") ?? ""} className="w-full rounded-xl border border-[var(--line)] px-3 py-2" placeholder="App slug" />
      <select name="reason" className="w-full rounded-xl border border-[var(--line)] px-3 py-2" required>
        {["Broken download","Incorrect metadata","Wrong platform","Incorrect version","Duplicate app","License issue","Security concern","Other"].map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <textarea name="details" className="w-full rounded-xl border border-[var(--line)] px-3 py-2" rows={5} />
      <button className="rounded-full bg-accent px-4 py-2 text-white">Submit</button>
    </form>
  );
}

export default function ReportPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Report an Issue</h1>
      <Suspense>
        <Form />
      </Suspense>
    </div>
  );
}
