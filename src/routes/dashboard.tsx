import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2, Clock, AlertCircle, FolderKanban } from "lucide-react";
import { statusColor, statusLabel, type TaskStatus } from "@/components/task-dialog";

export const Route = createFileRoute("/dashboard")({ component: () => <AuthGuard><AppShell><Dashboard /></AppShell></AuthGuard> });

interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  project_id: string;
  project_name?: string;
}

function Dashboard() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [{ data: t }, { count }] = await Promise.all([
        supabase.from("tasks").select("id, title, status, due_date, project_id, projects(name)").order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
      ]);
      type Row = { id: string; title: string; status: TaskStatus; due_date: string | null; project_id: string; projects: { name: string } | null };
      setTasks(((t ?? []) as Row[]).map((r) => ({ ...r, project_name: r.projects?.name })));
      setProjectCount(count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter((t) => t.status !== "done" && t.due_date && t.due_date < today);
  const myTasks = tasks.filter((t) => t.status !== "done");
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground mt-1">You're signed in as <span className="capitalize font-medium">{role}</span>.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Projects" value={projectCount} tone="primary" />
        <StatCard icon={Clock} label="In progress" value={inProgress} tone="accent" />
        <StatCard icon={CheckCircle2} label="Completed" value={done} tone="success" />
        <StatCard icon={AlertCircle} label="Overdue" value={overdue.length} tone="destructive" />
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold mb-3">Overdue</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : overdue.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Nothing overdue. 🎉</div>
        ) : (
          <div className="space-y-2">
            {overdue.map((t) => <TaskRow key={t.id} t={t} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold mb-3">Open tasks</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : myTasks.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No open tasks.</div>
        ) : (
          <div className="space-y-2">
            {myTasks.slice(0, 10).map((t) => <TaskRow key={t.id} t={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof CheckCircle2; label: string; value: number; tone: "primary" | "success" | "destructive" | "accent" }) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
    accent: "bg-accent text-accent-foreground",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-2xl font-bold font-display">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function TaskRow({ t }: { t: TaskItem }) {
  return (
    <Link to="/projects/$projectId" params={{ projectId: t.project_id }} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent/40 transition-colors">
      <div className="min-w-0">
        <p className="font-medium truncate">{t.title}</p>
        <p className="text-xs text-muted-foreground truncate">{t.project_name}{t.due_date ? ` · due ${t.due_date}` : ""}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
    </Link>
  );
}
