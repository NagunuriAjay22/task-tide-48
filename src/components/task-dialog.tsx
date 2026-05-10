import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  status: TaskStatus;
  due_date: string | null;
}

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().trim().max(2000).optional(),
  assignee_id: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "done"]),
  due_date: z.string().nullable(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  task?: TaskRow | null;
  members: { user_id: string; full_name: string | null; email: string | null }[];
  onSaved: () => void;
}

export function TaskDialog({ open, onOpenChange, projectId, task, members, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>("unassigned");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setAssignee(task?.assignee_id ?? "unassigned");
      setStatus(task?.status ?? "todo");
      setDueDate(task?.due_date ?? "");
    }
  }, [open, task]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      title,
      description: description || undefined,
      assignee_id: assignee === "unassigned" ? null : assignee,
      status,
      due_date: dueDate || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (task) {
      const { error } = await supabase.from("tasks").update({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        assignee_id: parsed.data.assignee_id,
        status: parsed.data.status,
        due_date: parsed.data.due_date,
      }).eq("id", task.id);
      setSaving(false);
      if (error) toast.error(error.message);
      else { toast.success("Task updated"); onSaved(); onOpenChange(false); }
    } else {
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        assignee_id: parsed.data.assignee_id,
        status: parsed.data.status,
        due_date: parsed.data.due_date,
        created_by: user.id,
      });
      setSaving(false);
      if (error) toast.error(error.message);
      else { toast.success("Task created"); onSaved(); onOpenChange(false); }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="t-due">Due date</Label>
            <Input id="t-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function statusLabel(s: TaskStatus) {
  return s === "todo" ? "To do" : s === "in_progress" ? "In progress" : "Done";
}

export function statusColor(s: TaskStatus): string {
  return s === "todo" ? "bg-muted text-muted-foreground" : s === "in_progress" ? "bg-accent text-accent-foreground" : "bg-success/15 text-success";
}
