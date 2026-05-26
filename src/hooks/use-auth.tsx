import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/permissions";

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  position: string | null;
  ramal: string | null;
  primary_sector_id: string | null;
  manager_id: string | null;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    try {
      const [{ data: prof, error: profErr }, { data: rolesData, error: rolesErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      
      if (profErr) {
        console.error("Profile load error:", profErr);
      }
      if (rolesErr) {
        console.error("Roles load error:", rolesErr);
      }

      setProfile(prof as Profile | null);
      setRoles((rolesData ?? []).map((r) => r.role as AppRole));
    } catch (err) {
      console.error("Unexpected error in loadUserData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: s }, error: sessionErr }) => {
      if (!mounted) return;
      
      if (sessionErr) {
        console.error("Session fetch error:", sessionErr);
        setLoading(false);
        return;
      }

      setSession(s);
      setUser(s?.user ?? null);
      
      if (s?.user) {
        loadUserData(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      
      const sessionUser = s?.user ?? null;
      
      // Update basic session info immediately
      setSession(s);
      setUser(sessionUser);
      
      if (sessionUser) {
        // Only trigger loading state for major events if we don't have a profile yet
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setLoading(true);
          await loadUserData(sessionUser.id);
        } else {
          // Silent refresh for TOKEN_REFRESHED, etc.
          loadUserData(sessionUser.id);
        }
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (user) await loadUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
