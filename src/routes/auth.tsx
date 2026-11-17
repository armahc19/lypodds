import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — LYPODDS" },
      { name: "description", content: "Create an account and get 1,000 virtual points to start trading." },
      { property: "og:title", content: "Sign in — LYPODDS" },
      { property: "og:description", content: "Get 1,000 virtual points to start trading." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/" });
  }, [navigate, ready, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin, data: { username: username || email.split("@")[0] } },
      });
      if (error) toast.error(error.message); else toast.success("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-4 py-16">
      <h1 className="text-3xl font-bold">{mode === "in" ? "Welcome back" : "Open an account"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">New traders start with 1,000 virtual points. No real money, ever.</p>
      <Button variant="outline" className="mt-6" onClick={google}>Continue with Google</Button>
      <Button variant="outline" className="mt-2" onClick={async () => {
        const r = await lovable.auth.signInWithOAuth("lovable", { redirect_uri: window.location.origin });
        if (r.error) toast.error(r.error.message ?? "Sign-in failed");
      }}>Continue with Lovable</Button>
      <div className="my-4 text-center font-mono text-xs text-muted-foreground">or</div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && (
          <div><Label htmlFor="u">Username</Label><Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} /></div>
        )}
        <div><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label htmlFor="p">Password</Label><Input id="p" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
      </form>
      <Button variant="ghost" className="mt-4 text-sm text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
      </Button>
    </main>
  );
}

