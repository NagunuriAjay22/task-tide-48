import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/projects/")({ component: () => <AuthGuard><AppShell><Projects /></AppShell></AuthGuard> });

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  description: z.string().trim().max(500).optional(),
});

function Projects() {
  const { role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, description: description || undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("projects").insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Project created"); setOpen(false); setName(""); setDescription(""); load(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">All projects you have access to.</p>
        </div>
        {role === "admin" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New project</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div>
                  <Label htmlFor="p-name">Name</Label>
                  <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="p-desc">Description</Label>
                  <Textarea id="p-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground">{role === "admin" ? "Create your first project to get started." : "Ask an admin to add you to a project."}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }} className="rounded-xl border bg-card p-5 hover:border-primary/50 transition-colors" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="h-9 w-9 rounded-lg mb-3 flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
                <FolderKanban className="h-4 w-4 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg truncate">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description || "No description"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
