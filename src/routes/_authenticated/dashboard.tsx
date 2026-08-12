import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet, TrendingUp, Users, ArrowDownToLine, ArrowUpFromLine,
  Sparkles, ChevronRight, ListChecks, Gift,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/kamdan-logo.png";
import { NGN } from "@/lib/format";
import { seo } from "@/lib/site";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawModal } from "@/components/WithdrawModal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => seo({ title: "Home — Kamdan Dashboard", path: "/dashboard", noindex: true }),
  component: Home,
});

interface Profile {
  username: string;
  referral_code: string;
  balance: number;
  earnings_balance: number;
  total_earnings: number;
  team_size: number;
  vip_level: number;
}
interface Tx {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [hasActiveInvestment, setHasActiveInvestment] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: p }, { data: t }, { count }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("transactions").select("*").eq("user_id", u.user.id)
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("user_investments").select("id", { count: "exact", head: true })
        .eq("user_id", u.user.id).eq("status", "active"),
    ]);
    if (p) setProfile(p as Profile);
    if (t) setTxs(t as Tx[]);
    setHasActiveInvestment((count ?? 0) > 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const walletTotal = Number(profile?.balance ?? 0) + Number(profile?.earnings_balance ?? 0);

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Kamdan logo" width={44} height={44} className="h-11 w-11 rounded-full" />
          <div>
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h1 className="text-base font-semibold text-foreground">{profile?.username || "User"}</h1>
          </div>
        </div>
        <Link
          to="/me"
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          Profile
        </Link>
      </header>

      <section
        aria-label="Account balance"
        className="relative mt-6 overflow-hidden rounded-3xl border border-border p-6"
        style={{ background: "var(--gradient-btn)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-widest text-primary-foreground/70">Total Balance</span>
          <span className="flex items-center gap-1 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            <Sparkles size={12} /> VIP {profile?.vip_level ?? 0}
          </span>
        </div>
        <p className="mt-3 text-4xl font-bold text-primary-foreground" style={{ fontFamily: "var(--font-display)" }}>
          {NGN(walletTotal)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-primary-foreground/10 p-2.5 backdrop-blur">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-primary-foreground/70">Deposit wallet</p>
            <p className="mt-0.5 text-sm font-bold text-primary-foreground">{NGN(profile?.balance ?? 0)}</p>
            <p className="text-[9px] text-primary-foreground/60">Buys products & withdrawable</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2.5 backdrop-blur">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-primary-foreground/70">Earnings</p>
            <p className="mt-0.5 text-sm font-bold text-primary-foreground">{NGN(profile?.earnings_balance ?? 0)}</p>
            <p className="text-[9px] text-primary-foreground/60">Tasks & daily profit</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowDeposit(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/25"
          >
            <ArrowDownToLine size={16} /> Deposit
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/25"
          >
            <ArrowUpFromLine size={16} /> Withdraw
          </button>
        </div>
      </section>
      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} onCreated={load} />}
      {showWithdraw && (
        <WithdrawModal
          walletBalance={walletTotal}
          hasActiveInvestment={hasActiveInvestment}
          onClose={() => setShowWithdraw(false)}
          onChanged={load}
        />
      )}

      <section aria-label="Stats" className="mt-4 grid grid-cols-2 gap-3">
        <StatCard icon={<TrendingUp size={18} />} label="Total Earnings" value={NGN(profile?.total_earnings ?? 0)} />
        <StatCard icon={<Users size={18} />} label="Team Size" value={String(profile?.team_size ?? 0)} />
      </section>

      <section aria-label="Quick links" className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/task"
          className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl transition hover:border-accent-cyan/50"
        >
          <div>
            <div className="flex items-center gap-2 text-accent-cyan">
              <ListChecks size={18} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Daily Task</span>
            </div>
            <p className="mt-2 text-sm font-semibold">Claim your ₦100</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </Link>
        <Link
          to="/referral"
          className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl transition hover:border-accent-cyan/50"
        >
          <div>
            <div className="flex items-center gap-2 text-accent-cyan">
              <Gift size={18} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Referral</span>
            </div>
            <p className="mt-2 text-sm font-semibold">Invite & earn</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </Link>
      </section>

      <section aria-label="Recent activity" className="mt-4 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        </div>
        {txs.length === 0 ? (
          <div className="py-8 text-center">
            <Wallet size={28} className="mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">No activity yet. Check in daily to start earning.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {txs.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-input/40 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium capitalize text-foreground">{tx.type.replace("_", " ")}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <span className={tx.type === "withdraw" ? "text-sm font-semibold text-destructive" : "text-sm font-semibold text-accent-cyan"}>
                  {tx.type === "withdraw" ? "-" : "+"}{NGN(Number(tx.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}


function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-accent-cyan">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
    </div>
  );
}
