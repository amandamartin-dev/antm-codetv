"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ApiJsonFormProps = {
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  title: string;
  submitLabel: string;
  defaultPayload: string;
};

export function ApiJsonForm({
  endpoint,
  method = "POST",
  title,
  submitLabel,
  defaultPayload,
}: ApiJsonFormProps) {
  const router = useRouter();
  const [payload, setPayload] = useState(defaultPayload);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");

    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      setStatus("Invalid JSON payload");
      setBusy(false);
      return;
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setStatus(data.error ?? "Request failed");
      setBusy(false);
      return;
    }

    setStatus("Saved");
    setBusy(false);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-200 p-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <textarea
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        className="h-32 w-full rounded border border-slate-300 p-2 font-mono text-xs"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Saving..." : submitLabel}
        </button>
        {status ? <p className="text-xs text-slate-600">{status}</p> : null}
      </div>
    </form>
  );
}
