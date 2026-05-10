import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { TaskDialog, statusColor, statusLabel, type TaskRow, type TaskStatus } from "@/components/task-dialog";

export const Route = createFileRoute("/projects/$projectId")({
  component: () => <AuthGuard><AppShell><ProjectDetail /></AppShell></AuthGuard>,
});

interface Profile { id: string; full_name: string | null; email: string | null }
interface Member { user_id: string; full_name: string | null; email: string | null }

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [project, setProject] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [addMemberId, setAddMemberId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: t }, { data: m }, { data: profs }] = await Promise.all([
      supabase.from("projects").select("id, name, description").eq("id", projectId).maybeSingle(),
      supabase.from("tasks").select("id, project_id, title, description, assignee_id, status, due_date").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("project_members").select("user_id, profiles(full_name, email)").eq("project_id", projectId),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    setProject(p);
    setTasks((t ?? []) as TaskRow[]);
    type MRow = { user_id: string; profiles: { full_name: string | null; email: string | null } | null };
    setMembers(((m ?? []) as MRow[]).map((r) => ({ user_id: r.user_id, full_name: r.profiles?.full_name ?? null, email: r.profiles?.email ?? null })));
    setAllProfiles(profs ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) toast.error(error.message);
    else { setTasks((ts) => ts.map((t) => t.id === taskId ? { ...t, status } : t)); }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Task deleted"); load(); }
  };

  const deleteProject = async () => {
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) toast.error(error.message);
    else { toast.success("Project deleted"); navigate({ to: "/projects" }); }
  };

  const addMember = async () => {
    if (!addMemberId) return;
    const { error } = await supabase.from("project_members").insert({ project_id: projectId, user_id: addMemberId });
    if (error) toast.error(error.message);
    else { toast.success("Member added"); setAddMemberId(""); load(); }
  };

  const removeMember = async (userId: string) => {
    const { error } = await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
    if (error) toast.error(error.message);
    else { load(); }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!project) return <p className="text-sm text-muted-foreground">Project not found.</p>;

  const grouped: Record<TaskStatus, TaskRow[]> = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const memberIds = new Set(members.map((m) => m.user_id));
  const candidates = allProfiles.filter((p) => !memberIds.has(p.id));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> All projects
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold">{project.name}</h1>
            {project.description && <p className="text-muted-foreground mt-1 max-w-2xl">{project.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New task
            </Button>
            {role === "admin" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                    <AlertDialogDescription>All tasks and members in this project will be removed. This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteProject} className="bg-destructive text-destructive-foreground hover:opacity-90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Members */}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold">Team</h2>
          {role === "admin" && candidates.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-2" />Add member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add member</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={addMemberId} onValueChange={setAddMemberId}>
                    <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button onClick={addMember} disabled={!addMemberId}>Add</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : members.map((m) => (
            <span key={m.user_id} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
              <span className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: "var(--gradient-brand)", color: "white" }}>
                {(m.full_name || m.email || "?").charAt(0).toUpperCase()}
              </span>
              {m.full_name || m.email}
              {role === "admin" && (
                <button onClick={() => removeMember(m.user_id)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* Task board */}
      <div className="grid md:grid-cols-3 gap-4">
        {(["todo", "in_progress", "done"] as TaskStatus[]).map((col) => (
          <div key={col} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">{statusLabel(col)}</h3>
              <span className="text-xs text-muted-foreground">{grouped[col].length}</span>
            </div>
            <div className="space-y-2">
              {grouped[col].map((t) => {
                const assignee = members.find((m) => m.user_id === t.assignee_id);
                const isOverdue = t.status !== "done" && t.due_date && t.due_date < today;
                return (
                  <div key={t.id} className="rounded-lg border bg-background p-3 hover:border-primary/50 transition-colors">
                    <button onClick={() => { setEditingTask(t); setTaskDialogOpen(true); }} className="text-left w-full">
                      <p className="font-medium text-sm">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>}
                    </button>
                    <div className="flex items-center justify-between mt-3 gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                        {assignee && (
                          <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white" style={{ background: "var(--gradient-brand)" }}>
                            {(assignee.full_name || assignee.email || "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                        {t.due_date && (
                          <span className={isOverdue ? "text-destructive font-medium" : ""}>{t.due_date}</span>
                        )}
                      </div>
                      <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v as TaskStatus)}>
                        <SelectTrigger className={`h-7 text-xs w-auto border-0 ${statusColor(t.status)}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To do</SelectItem>
                          <SelectItem value="in_progress">In progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {role === "admin" && (
                      <button onClick={() => deleteTask(t.id)} className="mt-2 text-xs text-muted-foreground hover:text-destructive inline-flex items-center">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </button>
                    )}
                  </div>
                );
              })}
              {grouped[col].length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={projectId}
        task={editingTask}
        members={members}
        onSaved={load}
      />
    </div>
  );
}
