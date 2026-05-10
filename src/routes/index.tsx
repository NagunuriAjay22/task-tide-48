import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg" style={{ background: "var(--gradient-brand)" }} />
          <span className="font-display font-bold text-lg">Tasker</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/signup"><Button>Get started</Button></Link>
        </div>
      </header>

      <section className="px-6 py-20 md:py-32 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
          <span className="h-2 w-2 rounded-full bg-success" /> Built for fast-moving teams
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          Ship projects.{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-brand)" }}>
            Together.
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          A clean, modern project & task tracker. Create projects, assign work, and watch progress unfold — with built-in admin and member roles.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/signup"><Button size="lg" className="px-8" style={{ boxShadow: "var(--shadow-elegant)" }}>Start free</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline" className="px-8">Sign in</Button></Link>
        </div>
      </section>

      <section className="px-6 pb-24 max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {[
          { icon: CheckCircle2, title: "Task tracking", desc: "Create, assign, and move tasks through statuses with clear due dates." },
          { icon: Users, title: "Roles built-in", desc: "Admins manage projects and teams. Members focus on getting work done." },
          { icon: BarChart3, title: "Live dashboard", desc: "See overdue, in-progress, and completed work at a glance." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--gradient-brand)" }}>
              <f.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
