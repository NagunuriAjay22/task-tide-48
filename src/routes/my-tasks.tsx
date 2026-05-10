import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { statusColor, statusLabel, type TaskStatus } from "@/components/task-dialog";

export const Route = createFileRoute("/my-tasks")({ component: () => <AuthGuard><AppShell><MyTasks /></AppShell></AuthGuard> });

interface T { id: string; title: string; status: TaskStatus; due_date: string | null; project_id: string; project_name?: string }

function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, due_date, project_id, projects(name)")
        .eq("assignee_id", user.id)
        .order("due_date", { ascending: true, nullsFirst: false });
      type Row = { id: string; title: string; status: TaskStatus; due_date: string | null; project_id: string; projects: { name: string } | null };
      setTasks(((data ?? []) as Row[]).map((r) => ({ ...r, project_name: r.projects?.name })));
      setLoading(false);
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-6">My tasks</h1>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
        tasks.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">No tasks assigned to you.</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const overdue = t.status !== "done" && t.due_date && t.due_date < today;
              return (
                <Link key={t.id} to="/projects/$projectId" params={{ projectId: t.project_id }} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.project_name}
                      {t.due_date && (<span className={overdue ? "text-destructive font-medium ml-1" : "ml-1"}>· due {t.due_date}</span>)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
