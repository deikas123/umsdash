import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/operations/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Shield, KeyRound, Mail, Search, Phone } from "lucide-react";
import { toast } from "sonner";

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  manager: "bg-warning/10 text-warning",
  user: "bg-primary/10 text-primary",
  staff: "bg-primary/10 text-primary",
  customer: "bg-muted text-muted-foreground",
};

export default function OpUserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<{ userId: string; currentEmail: string } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "user" });
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ userId: string; name: string } | null>(null);
  const [resetPw, setResetPw] = useState({ new_password: "", confirm: "" });
  const [phoneDialog, setPhoneDialog] = useState<{ open: boolean; userId: string; phone: string }>({
    open: false,
    userId: "",
    phone: "",
  });
  const [myPhone, setMyPhone] = useState("");

  const { data: currentUserRole } = useQuery({
    queryKey: ["my_role"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).single();
      return data?.role || "user";
    },
  });

  const isAdmin = currentUserRole === "admin";

  const { data: myProfileData } = useQuery({
    queryKey: ["my_profile", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (myProfileData?.phone) {
      setMyPhone(myProfileData.phone);
    }
  }, [myProfileData?.phone]);

  const savePhoneMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ phone: myPhone || null })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_profile", user!.id] });
      toast.success("Phone number saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["all_profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profs || []).map((p: any) => ({
        ...p,
        role: (roles || []).find((r: any) => r.user_id === p.user_id)?.role || "user",
      }));
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: newUser.email, password: newUser.password, full_name: newUser.full_name, role: newUser.role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_profiles"] });
      setCreateOpen(false);
      setNewUser({ email: "", password: "", full_name: "", role: "user" });
      toast.success("User created successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").update({ role: role as any }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_profiles"] });
      toast.success("Role updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (passwords.new_password !== passwords.confirm) throw new Error("Passwords do not match");
      if (passwords.new_password.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: passwords.new_password });
      if (error) throw error;
    },
    onSuccess: () => {
      setPwOpen(false);
      setPasswords({ new_password: "", confirm: "" });
      toast.success("Password changed successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeEmailMutation = useMutation({
    mutationFn: async () => {
      if (!emailTarget || !newEmail) throw new Error("Missing data");
      const { data, error } = await supabase.functions.invoke("admin-update-email", {
        body: { user_id: emailTarget.userId, new_email: newEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_profiles"] });
      setEmailOpen(false);
      setEmailTarget(null);
      setNewEmail("");
      toast.success("Email updated successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetTarget) throw new Error("Missing user");
      if (resetPw.new_password !== resetPw.confirm) throw new Error("Passwords do not match");
      if (resetPw.new_password.length < 10) throw new Error("Password must be at least 10 characters");
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: resetTarget.userId, new_password: resetPw.new_password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success(`Password reset for ${resetTarget?.name || "user"}.`);
      setResetOpen(false);
      setResetTarget(null);
      setResetPw({ new_password: "", confirm: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async ({ userId, phone }: { userId: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ phone: phone || null })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_profiles"] });
      setPhoneDialog({ open: false, userId: "", phone: "" });
      toast.success("Phone number updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = profiles.filter((p: any) => {
    const matchSearch =
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.department || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      <PageHeader
        title="User Management"
        description={isAdmin ? "Manage users, roles, and permissions." : "Manage your account settings."}
        actions={
          <div className="flex gap-2">
            <Dialog open={pwOpen} onOpenChange={setPwOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-[4px]">
                  <KeyRound className="h-3.5 w-3.5" /> Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Change Your Password</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">New Password</Label>
                    <Input type="password" className="h-9 mt-1 rounded-[4px]" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} minLength={6} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Confirm Password</Label>
                    <Input type="password" className="h-9 mt-1 rounded-[4px]" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
                  </div>
                  <Button className="w-full rounded-[4px]" onClick={() => changePasswordMutation.mutate()} disabled={changePasswordMutation.isPending || !passwords.new_password}>
                    {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {isAdmin && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 rounded-[4px]"><Plus className="h-3.5 w-3.5" /> Create User</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label className="text-xs font-semibold text-muted-foreground">Full Name</Label><Input className="h-9 mt-1 rounded-[4px]" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} /></div>
                    <div><Label className="text-xs font-semibold text-muted-foreground">Email</Label><Input type="email" className="h-9 mt-1 rounded-[4px]" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required /></div>
                    <div><Label className="text-xs font-semibold text-muted-foreground">Password</Label><Input type="password" className="h-9 mt-1 rounded-[4px]" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} minLength={6} required /></div>
                    <div><Label className="text-xs font-semibold text-muted-foreground">Role</Label>
                      <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                        <SelectTrigger className="h-9 mt-1 rounded-[4px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full rounded-[4px]" onClick={() => createUserMutation.mutate()} disabled={createUserMutation.isPending || !newUser.email || !newUser.password}>
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {isAdmin && (
        <>
          {/* Filters */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 rounded-[4px] pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-36 rounded-[4px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="card-shadow rounded-lg bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 label-caps">Name</th>
                  <th className="px-5 py-3 label-caps">Department</th>
                  <th className="px-5 py-3 label-caps">Phone</th>
                  <th className="px-5 py-3 label-caps">Role</th>
                  <th className="px-5 py-3 label-caps">Joined</th>
                  <th className="px-5 py-3 label-caps">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                    <td className="px-5 py-3 font-medium">{p.full_name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.department || "—"}</td>
                    <td className="px-5 py-3 font-mono-data text-muted-foreground">{p.phone || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${roleColors[p.role] || ""}`}>{p.role}</span>
                    </td>
                    <td className="px-5 py-3 font-mono-data text-muted-foreground">{p.created_at?.split("T")[0]}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {p.user_id !== user?.id && (
                          <>
                            <Select value={p.role} onValueChange={(v) => updateRoleMutation.mutate({ userId: p.user_id, role: v })}>
                              <SelectTrigger className="h-7 w-28 rounded-[4px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-[4px] text-xs" onClick={() => {
                              setEmailTarget({ userId: p.user_id, currentEmail: "" });
                              setNewEmail("");
                              setEmailOpen(true);
                            }}>
                              <Mail className="h-3 w-3" /> Email
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-[4px] text-xs" onClick={() => {
                              setResetTarget({ userId: p.user_id, name: p.full_name || "" });
                              setResetPw({ new_password: "", confirm: "" });
                              setResetOpen(true);
                            }}>
                              <KeyRound className="h-3 w-3" /> Reset Password
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-[4px] text-xs" onClick={() => {
                              setPhoneDialog({ open: true, userId: p.user_id, phone: p.phone || "" });
                            }}>
                              <Phone className="h-3 w-3" /> Phone
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {isLoading && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>}
              </tbody>
            </table>
            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mb-2" /><p className="text-sm">No users found.</p>
              </div>
            )}
          </div>

          {/* Change Email Dialog */}
          <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Change User Email</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">New Email Address</Label>
                  <Input type="email" className="h-9 mt-1 rounded-[4px]" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" required />
                </div>
                <Button className="w-full rounded-[4px]" onClick={() => changeEmailMutation.mutate()} disabled={changeEmailMutation.isPending || !newEmail}>
                  {changeEmailMutation.isPending ? "Updating..." : "Update Email"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Reset Password{resetTarget?.name ? ` — ${resetTarget.name}` : ""}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">New Password</Label>
                  <Input type="password" className="h-9 mt-1 rounded-[4px]" value={resetPw.new_password} onChange={(e) => setResetPw({ ...resetPw, new_password: e.target.value })} placeholder="At least 10 characters" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Confirm Password</Label>
                  <Input type="password" className="h-9 mt-1 rounded-[4px]" value={resetPw.confirm} onChange={(e) => setResetPw({ ...resetPw, confirm: e.target.value })} />
                </div>
                <Button className="w-full rounded-[4px]" onClick={() => resetPasswordMutation.mutate()} disabled={resetPasswordMutation.isPending || !resetPw.new_password}>
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Phone Dialog */}
          <Dialog open={phoneDialog.open} onOpenChange={(open) => setPhoneDialog((prev) => ({ ...prev, open }))}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Phone Number</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Phone Number (+254...)</Label>
                  <Input
                    className="h-9 mt-1 rounded-[4px]"
                    placeholder="254712345678"
                    value={phoneDialog.phone}
                    onChange={(e) => setPhoneDialog((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full rounded-[4px]"
                  onClick={() => updatePhoneMutation.mutate({ userId: phoneDialog.userId, phone: phoneDialog.phone })}
                  disabled={updatePhoneMutation.isPending}
                >
                  {updatePhoneMutation.isPending ? "Saving..." : "Save Phone Number"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {!isAdmin && (
        <div className="card-shadow rounded-lg bg-card p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-foreground">Your Account</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Email: {user?.email}</p>
          <p className="text-sm text-muted-foreground">Role: <span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${roleColors[currentUserRole || "user"]}`}>{currentUserRole}</span></p>
          <p className="text-xs text-muted-foreground mt-3">Use "Change Password" above to update your password.</p>
          <div className="mt-4 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Phone Number (+254...)</Label>
            <div className="flex gap-2">
              <Input
                className="h-9 rounded-[4px]"
                placeholder="254712345678"
                value={myPhone}
                onChange={(e) => setMyPhone(e.target.value)}
              />
              <Button
                size="sm"
                className="h-9 rounded-[4px]"
                onClick={() => savePhoneMutation.mutate()}
                disabled={savePhoneMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
