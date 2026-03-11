"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Issue = { id: string; key: string; title: string };

type DependencyFormProps = {
  issueId: string;
  availableIssues: Issue[];
};

export function DependencyForm({ issueId, availableIssues }: DependencyFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [blockedByIssueId, setBlockedByIssueId] = useState("");

  const filteredIssues = availableIssues.filter((i) => i.id !== issueId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockedByIssueId) return;

    setBusy(true);
    setStatus("");

    const response = await fetch(`/api/issues/${issueId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedByIssueId }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setStatus(data.error ?? "Request failed");
      setBusy(false);
      return;
    }

    setStatus("Dependency added");
    setBlockedByIssueId("");
    setBusy(false);
    router.refresh();
  };

  if (filteredIssues.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Dependency</CardTitle>
          <CardDescription>No other issues available to add as blockers</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Dependency</CardTitle>
        <CardDescription>Mark an issue that blocks this one</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Select value={blockedByIssueId} onValueChange={(v) => setBlockedByIssueId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select blocking issue" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {filteredIssues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    {issue.key} - {issue.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy || !blockedByIssueId}>
              {busy ? "Adding..." : "Add Blocker"}
            </Button>
            {status && <p className="text-sm text-muted-foreground">{status}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
