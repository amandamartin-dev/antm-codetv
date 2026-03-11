"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type User = { id: string; name: string };

type ProjectFormProps = {
  mode: "create" | "edit";
  projectId?: string;
  users?: User[];
  currentUserId: string;
  defaultValues?: {
    key?: string;
    name?: string;
    description?: string | null;
    status?: string;
    leadUserId?: string | null;
  };
};

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ProjectForm({
  mode,
  projectId,
  users = [],
  currentUserId,
  defaultValues = {},
}: ProjectFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const [key, setKey] = useState(defaultValues.key ?? "");
  const [name, setName] = useState(defaultValues.name ?? "");
  const [description, setDescription] = useState(defaultValues.description ?? "");
  const [projectStatus, setProjectStatus] = useState(defaultValues.status ?? "PLANNED");
  const [leadUserId, setLeadUserId] = useState(defaultValues.leadUserId ?? currentUserId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus("");

    const endpoint = mode === "create" ? "/api/projects" : `/api/projects/${projectId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const payload: Record<string, unknown> = {
      name,
      description: description || null,
      status: projectStatus,
      leadUserId: leadUserId || null,
    };

    if (mode === "create") {
      payload.key = key.toUpperCase().replace(/\s+/g, "-");
      payload.memberIds = [currentUserId];
    }

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setStatus(data.error ?? "Request failed");
      setBusy(false);
      return;
    }

    setStatus(mode === "create" ? "Project created" : "Project updated");
    setBusy(false);

    if (mode === "create") {
      setKey("");
      setName("");
      setDescription("");
    }

    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">
          {mode === "create" ? "Create Project" : "Update Project"}
        </CardTitle>
        <CardDescription>
          {mode === "create" ? "Start a new project" : "Modify project details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="key">Project Key</Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="e.g. CORE-PLATFORM"
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier, will be uppercased
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select value={projectStatus} onValueChange={(v) => v && setProjectStatus(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {users.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Lead</Label>
              <Select value={leadUserId} onValueChange={(v) => setLeadUserId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">No lead</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : mode === "create" ? "Create Project" : "Update Project"}
            </Button>
            {status && <p className="text-sm text-muted-foreground">{status}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
