import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  CandlestickChart,
  LayoutDashboard,
  Radio,
  SlidersHorizontal,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";

import { Logo, LogoMark } from "@/components/brand/logo";
import { LiveDot } from "@/components/common/live-dot";
import { fmtIndex, fmtMinute, fmtPts } from "@/lib/sim/format";
import { useSim } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/matches", label: "Live Matches", icon: Radio, exact: false },
  { to: "/trading", label: "Trading", icon: CandlestickChart, exact: false },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, exact: false },
  { to: "/portfolio", label: "Portfolio", icon: Wallet, exact: false },
  { to: "/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

function LiveTicker() {
  const { state } = useSim();
  const live = state.matches.filter((m) => m.status === "live");
  const items = [...live, ...live];
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <div className="flex w-max animate-ticker gap-8 py-1 hover:[animation-play-state:paused]">
        {items.map((m, i) => (
          <Link key={`${m.id}-${i}`} to="/matches/$matchId" params={{ matchId: m.id }} className="flex items-center gap-2 whitespace-nowrap text-xs hover:text-primary">
            <LiveDot className="size-1.5" />
            <span className="font-medium">{m.home.short}</span>
            <span className="num font-bold">{m.score.home}-{m.score.away}</span>
            <span className="font-medium">{m.away.short}</span>
            <span className="num text-muted-foreground">{fmtMinute(m.clock)}</span>
            <span className={cn("num font-semibold", m.index >= 0 ? "text-bull" : "text-bear")}>
              {m.index >= 0 ? "▲" : "▼"} {fmtIndex(m.index)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BalancePill() {
  const { state } = useSim();
  return (
    <Link to="/portfolio" className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 hover:border-primary/50">
      <Wallet className="size-4 text-primary" />
      <span className="num text-sm font-semibold">{fmtPts(state.user.balance)}</span>
      <span className="hidden text-xs text-muted-foreground sm:inline">pts</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state } = useSim();
  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="px-5 py-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
            >
              <Icon className="size-4 group-data-[status=active]:text-primary" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-3 p-3">
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-md border border-dashed border-sidebar-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary/60 data-[status=active]:text-primary"
          >
            <SlidersHorizontal className="size-4" />
            Sim controls <span className="ml-auto font-mono text-[0.6rem]">DEV</span>
          </Link>
          <div className="rounded-md bg-surface px-3 py-2.5 text-[0.68rem] leading-relaxed text-muted-foreground">
            Virtual points only. No real money, deposits or payouts.
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6">
          <Link to="/" className="lg:hidden">
            <LogoMark className="size-7" />
          </Link>
          <LiveTicker />
          {state.paused && <span className="hidden rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold tracking-widest text-primary sm:inline">SIM PAUSED</span>}
          <BalancePill />
          <Link to="/profile" className="flex size-8 items-center justify-center rounded-full bg-brand-gradient font-display text-xs font-bold text-primary-foreground" aria-label="Profile">
            {state.user.username.slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 pb-28 md:px-6 lg:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="flex flex-col items-center gap-1 py-2.5 text-[0.6rem] text-muted-foreground data-[status=active]:text-primary"
          >
            <Icon className="size-5" />
            <span className="truncate">{label.replace("Live ", "")}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
