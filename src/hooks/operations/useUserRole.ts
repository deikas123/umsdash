import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "manager" | "user";

export function useUserRole() {
  const { user } = useAuth();
  const { data: role, isLoading } = useQuery({
    queryKey: ["current-user-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      const roles = (data || []).map((r) => r.role as AppRole);
      if (roles.includes("admin")) return "admin" as AppRole;
      if (roles.includes("manager")) return "manager" as AppRole;
      return "user" as AppRole;
    },
  });

  return {
    role: role ?? "user",
    isAdmin: role === "admin",
    isManager: role === "manager" || role === "admin",
    loading: isLoading,
  };
}
