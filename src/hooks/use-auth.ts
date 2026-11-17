import { createContext, useContext, useEffect, useState, useCallback, createElement, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; username: string; points: number };

function useAccountState() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  const load = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) { setProfile(null); setIsAdmin(false); setReady(true); return; }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id,username,points").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    setProfile(p ? { ...p, points: Number(p.points) } : null);
    setIsAdmin(!!r?.some((x) => x.role === "admin"));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!configured) { setReady(true); return; }
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(e)) setTimeout(() => load(s?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [configured, load]);

  useEffect(() => {
    if (!user) return;
    const poll = setInterval(() => load(user), 4000);
    return () => clearInterval(poll);
  }, [user, load]);

  const refresh = useCallback(() => load(user), [load, user]);
  return { user, profile, isAdmin, ready, refresh };
}

const AuthContext = createContext<ReturnType<typeof useAccountState> | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  return createElement(AuthContext.Provider, { value: useAccountState() }, children);
}

export function useAuth() {
  const account = useContext(AuthContext);
  if (!account) throw new Error("Account provider is missing");
  return account;
}

