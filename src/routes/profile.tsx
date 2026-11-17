import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Award, Flame, Medal, RotateCcw, ShieldCheck, SlidersHorizontal, Target, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { fmtPct, fmtPts } from "@/lib/sim/format";
import { leaderboard, userStats } from "@/lib/sim/selectors";
import { useSim } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LYPODDS" },
      { name: "description", content: "Your LYPODDS trader profile, badges and account settings." },
      { property: "og:title", content: "Trader Profile — LYPODDS" },
      { property: "og:description", content: "Trader profile, achievements and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function tier(balance: number) {
  if (balance >= 20000) return "Elite trader";
  if (balance >= 12000) return "Pro trader";
  return "Rookie trader";
}

function ProfilePage() {
  const { state, dispatch } = useSim();
  const { user } = state;
  const [name, setName] = useState(user.username);
  const [confirmReset, setConfirmReset] = useState(false);
  const s = userStats(user.positions);
  const globalRank = leaderboard(state, "global").find((r) => r.isUser)!.rank;
  const possessionTrades = user.positions.filter((p) => p.market === "possession").length;

  const badges = [
    { icon: Zap, label: "First trade", desc: "Place a prediction", done: s.total >= 1 },
    { icon: Flame, label: "Hot streak", desc: "Win 3 in a row", done: user.bestStreak >= 3 },
    { icon: Target, label: "Sharpshooter", desc: "60%+ accuracy over 10 calls", done: s.won + s.lost >= 10 && s.accuracy >= 0.6 },
    { icon: Award, label: "Tape reader", desc: "20 possession trades", done: possessionTrades >= 20 },
    { icon: Medal, label: "Top 10", desc: "Reach global top 10", done: globalRank <= 10 },
  ];

  const save = () => {
    const clean = name.trim().replace(/\s+/g, "_").slice(0, 20);
    if (clean.length < 3) {
      toast.error("Username needs at least 3 characters");
      return;
    }
    dispatch({ type: "SET_USERNAME", username: clean });
    setName(clean);
    toast.success("Username updated");
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Profile" />

      <section className="panel flex flex-wrap items-center gap-5 p-5">
        <div className="flex size-16 items-center justify-center rounded-full bg-brand-gradient font-display text-2xl font-bold text-primary-foreground">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-display text-2xl font-bold">{user.username}</div>
          <div className="text-sm text-muted-foreground">{tier(user.balance)} · Global rank #{globalRank}</div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <div>
            <div className="label-caps">Points</div>
            <div className="num font-semibold">{fmtPts(user.balance)}</div>
          </div>
          <div>
            <div className="label-caps">Accuracy</div>
            <div className="num font-semibold">{fmtPct(s.accuracy)}</div>
          </div>
          <div>
            <div className="label-caps">Best streak</div>
            <div className="num font-semibold">{user.bestStreak}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Settings</h2>
          <label htmlFor="username" className="label-caps mt-4 block">Username</label>
          <div className="mt-1.5 flex gap-2">
            <Input id="username" value={name} onChange={(e) => setName(e.target.value)} className="bg-surface" maxLength={20} />
            <Button variant="terminal" onClick={save}>Save</Button>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="size-4 text-bull" /> Virtual points only
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              LYPODDS is a skill game. There are no deposits, withdrawals or real-money betting — points have no cash value.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {confirmReset ? (
              <>
                <Button
                  variant="sell"
                  onClick={() => {
                    dispatch({ type: "RESET_USER" });
                    setConfirmReset(false);
                    toast.success("Account reset to 10,000 pts");
                  }}
                >
                  Confirm reset
                </Button>
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </>
            ) : (
              <Button variant="terminal" onClick={() => setConfirmReset(true)}>
                <RotateCcw /> Reset points & history
              </Button>
            )}
            <Button asChild variant="terminal">
              <Link to="/admin"><SlidersHorizontal /> Sim controls</Link>
            </Button>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="mb-4 text-lg font-semibold">Badges</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {badges.map(({ icon: Icon, label, desc, done }) => (
              <li key={label} className={cn("flex items-center gap-3 rounded-lg border p-3", done ? "border-primary/40 bg-primary/5" : "border-border bg-surface opacity-60")}>
                <Icon className={cn("size-5", done ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
