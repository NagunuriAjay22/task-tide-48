import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/team")({
  component: () => <AuthGuard adminOnly><AppShell><Team /></AppShell></AuthGuard>,
});

type Role = "admin" | "member";
interface Member { id: string; full_name: string | null; email: string | null; role: Role }

function Team() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, Role>();
    (roles ?? []).forEach((r) => {
      const existing = roleMap.get(r.user_id);
      if (r.role === "admin" || !existing) roleMap.set(r.user_id, r.role as Role);
    });
    setMembers((profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "member" })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setRole = async (userId: string, role: Role) => {
    // Replace existing role
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) { toast.error(delErr.message); return; }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (insErr) toast.error(insErr.message);
    else { toast.success("Role updated"); load(); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Team</h1>
        <p className="text-muted-foreground mt-1">Manage user roles. Admins can create projects and manage everything.</p>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="rounded-xl border bg-card divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ background: "var(--gradient-brand)" }}>
                  {(m.full_name || m.email || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
              </div>
              <Select value={m.role} onValueChange={(v) => setRole(m.id, v as Role)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
