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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type User = { id: string; name: string };

type AddMemberFormProps = {
  teamId: string;
  users: User[];
  existingMemberIds: string[];
};

export function AddMemberForm({ teamId, users, existingMemberIds }: AddMemberFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");

  const availableUsers = users.filter((u) => !existingMemberIds.includes(u.id));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setBusy(true);
    setStatus("");

    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setStatus(data.error ?? "Request failed");
      setBusy(false);
      return;
    }

    setStatus("Member added");
    setUserId("");
    setBusy(false);
    router.refresh();
  };

  if (availableUsers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add Member</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All users are already members</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Add Member</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Select value={userId} onValueChange={(v) => setUserId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={busy || !userId}>
              {busy ? "Adding..." : "Add"}
            </Button>
            {status && <p className="text-xs text-muted-foreground">{status}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
