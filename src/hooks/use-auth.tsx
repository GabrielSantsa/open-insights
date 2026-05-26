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
    // We don't block loading here to prevent infinite spinners on slow networks
    try {
      const [{ data: prof, error: profErr }, { data: rolesData, error: rolesErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      
      if (profErr) console.error("Profile load error:", profErr);
      if (rolesErr) console.error("Roles load error:", rolesErr);

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

    // Initial check - minimal blocking
    const checkInitialAuth = async () => {
      try {
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.error("Initial session error:", error);
          setLoading(false);
          return;
        }

        setSession(s);
        setUser(s?.user ?? null);
        
        if (s?.user) {
          await loadUserData(s.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init catch:", err);
        if (mounted) setLoading(false);
      }
    };

    checkInitialAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      
      const sessionUser = s?.user ?? null;
      setSession(s);
      setUser(sessionUser);
      
      if (sessionUser) {
        // For events like sign in, we want to ensure data is fresh
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          loadUserData(sessionUser.id);
        } else if (!profile && !loading) {
          // If we have a user but no profile, try to load it silently
          loadUserData(sessionUser.id);
        }
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    // Safety timeout: Never let loading take more than 5 seconds
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth safety timeout triggered");
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
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
