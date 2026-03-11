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

type Team = { id: string; key: string; name: string };
type Project = { id: string; key: string; name: string };
type Label = { id: string; name: string; color: string };
type User = { id: string; name: string };

type IssueFormProps = {
  mode: "create" | "edit";
  issueId?: string;
  teams: Team[];
  projects: Project[];
  labels: Label[];
  users?: User[];
  defaultValues?: {
    title?: string;
    description?: string;
    teamId?: string;
    projectId?: string | null;
    assigneeUserId?: string | null;
    labelId?: string | null;
    status?: string;
    priority?: string;
    dueDate?: string | null;
  };
};

const STATUS_OPTIONS = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "NONE", label: "None" },
];

export function IssueForm({
  mode,
  issueId,
  teams,
  projects,
  labels,
  users = [],
  defaultValues = {},
}: IssueFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const [title, setTitle] = useState(defaultValues.title ?? "");
  const [description, setDescription] = useState(defaultValues.description ?? "");
  const [teamId, setTeamId] = useState(defaultValues.teamId ?? teams[0]?.id ?? "");
  const [projectId, setProjectId] = useState(defaultValues.projectId ?? "");
  const [assigneeUserId, setAssigneeUserId] = useState(defaultValues.assigneeUserId ?? "");
  const [labelId, setLabelId] = useState(defaultValues.labelId ?? "");
  const [issueStatus, setIssueStatus] = useState(defaultValues.status ?? "TODO");
  const [priority, setPriority] = useState(defaultValues.priority ?? "MEDIUM");
  const [dueDate, setDueDate] = useState(defaultValues.dueDate ?? "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus("");

    const endpoint = mode === "create" ? "/api/issues" : `/api/issues/${issueId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const payload = {
      title,
      description: description || null,
      teamId,
      projectId: projectId || null,
      assigneeUserId: assigneeUserId || null,
      labelId: labelId || null,
      status: issueStatus,
      priority,
      dueDate: dueDate || null,
    };

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

    setStatus(mode === "create" ? "Issue created" : "Issue updated");
    setBusy(false);
    
    if (mode === "create") {
      setTitle("");
      setDescription("");
    }
    
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">
          {mode === "create" ? "Create Issue" : "Update Issue"}
        </CardTitle>
        <CardDescription>
          {mode === "create" ? "Add a new issue to track" : "Modify issue details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={issueStatus} onValueChange={(v) => v && setIssueStatus(v)}>
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

            <div className="flex flex-col gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Team</Label>
            <Select value={teamId} onValueChange={(v) => v && setTeamId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.key} - {team.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Project (optional)</Label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.key} - {project.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {users.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Assignee (optional)</Label>
              <Select value={assigneeUserId} onValueChange={(v) => setAssigneeUserId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">Unassigned</SelectItem>
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

          {labels.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Label (optional)</Label>
              <Select value={labelId} onValueChange={(v) => setLabelId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">No label</SelectItem>
                    {labels.map((label) => (
                      <SelectItem key={label.id} value={label.id}>
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="dueDate">Due Date (optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate ? dueDate.split("T")[0] : ""}
              onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : mode === "create" ? "Create Issue" : "Update Issue"}
            </Button>
            {status && <p className="text-sm text-muted-foreground">{status}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
