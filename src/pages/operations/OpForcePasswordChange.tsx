import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function OpForcePasswordChange() {
  const { signOut } = useAuth();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== confirm) return toast.error("Passwords do not match");
    if (pw.length < 10) return toast.error("Password must be at least 10 characters");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("complete-password-change", { body: { new_password: pw } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.auth.refreshSession();
      toast.success("Password updated. Welcome!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="card-depth rounded-lg bg-card p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-lg font-medium text-foreground">Choose a new password</h1>
            <p className="text-sm text-muted-foreground mt-1">Your password was reset by an administrator. Set your own password to continue.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">New Password</Label>
              <Input type="password" className="h-9 mt-1.5 rounded-[4px]" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="At least 10 characters" required />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Confirm Password</Label>
              <Input type="password" className="h-9 mt-1.5 rounded-[4px]" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </div>
            <Button type="submit" className="w-full rounded-[4px] h-9" disabled={loading}>
              {loading ? "Saving…" : "Set Password"}
            </Button>
            <Button type="button" variant="ghost" className="w-full rounded-[4px] h-9" onClick={() => signOut()}>
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
