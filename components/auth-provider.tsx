"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthContext = { user: User | null; loading: boolean; signOut: () => Promise<void> };
const Context = createContext<AuthContext>({ user: null, loading: true, signOut: async () => {} });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let mounted = true; const supabase = getSupabaseBrowserClient(); supabase.auth.getUser().then(({ data }) => { if (mounted) { setUser(data.user); setLoading(false); } }); const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setLoading(false); }); return () => { mounted = false; listener.subscription.unsubscribe(); }; }, []);
  const signOut = async () => { await getSupabaseBrowserClient().auth.signOut(); setUser(null); };
  return <Context.Provider value={{ user, loading, signOut }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
