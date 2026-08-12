import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Check, ListChecks, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NGN, lagosToday } from "@/lib/format";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/task")({
  head: () => seo({ title: "Tasks — Daily Sign-in & Earnings | Keppta Investment", path: "/task", noindex: true }),
  component: TaskPage,
});

interface Checkin { checkin_date: string; day_in_streak: number; }
interface Tx { id: string; type: string; amount: number; created_at: string; status: string; }

function TaskPage() {
  const [lastCheckin, setLastCheckin] = useState<Checkin | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from("daily_checkins").select("checkin_date, day_in_streak")
        .eq("user_id", u.user.id).order("checkin_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("transactions").select("*").eq("user_id", u.user.id)
        .in("type", ["earning", "referral_bonus"])
        .order("created_at", { ascending: false }).limit(15),
    ]);
    setLastCheckin((c as Checkin) ?? null);
    setTxs((t as Tx[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = lagosToday();
  const claimedToday = lastCheckin?.checkin_date === today;
  const yesterday = (() => { const d = new Date(today); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const streakActive = lastCheckin && (lastCheckin.checkin_date === today || lastCheckin.checkin_date === yesterday);
  const currentStreak = streakActive ? lastCheckin!.day_in_streak : 0;
  const nextDay = claimedToday ? currentStreak : streakActive && currentStreak < 7 ? currentStreak + 1 : 1;

  const claim = async () => {
    if (claiming || claimedToday) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_daily_checkin");
    setClaiming(false);
    if (error) { toast.error(error.message); return; }
    const res = data as { ok: boolean; day?: number; amount?: number };
    if (!res.ok) { toast.info("Already claimed today. Come back tomorrow!"); return; }
    toast.success(`Day ${res.day} claimed — +${NGN(res.amount ?? 0)}`);
    load();
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in daily and complete tasks to earn rewards.</p>
      </header>

      <section aria-label="Daily check-in" className="mt-5 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Flame size={16} className="text-accent-cyan" /> Daily Check-in
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Streak {currentStreak}/7
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign in every day to earn ₦100. On day 7 you get ₦500. Miss a day and the streak resets.
        </p>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const day = i + 1;
            const claimed = day <= currentStreak && (claimedToday || day < currentStreak + 1);
            const isToday = day === nextDay && !claimedToday;
            const isBig = day === 7;
            return (
              <div key={day}
                className={"flex flex-col items-center justify-center rounded-lg border py-2 text-[10px] font-semibold " +
                  (claimed ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                    : isToday ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 bg-input/40 text-muted-foreground")}>
                {claimed ? <Check size={14} /> : <span>D{day}</span>}
                <span className={"mt-0.5 " + (isBig ? "text-[9px] text-accent-cyan" : "text-[9px] opacity-70")}>
                  {isBig ? "₦500" : "₦100"}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={claim}
          disabled={claimedToday || claiming}
          className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-50"
          style={{ background: "var(--gradient-btn)" }}
        >
          {claimedToday ? "Claimed today — come back tomorrow"
            : claiming ? "Claiming…"
            : `Claim Day ${nextDay} — +${nextDay === 7 ? "₦500" : "₦100"}`}
        </button>
      </section>

      <section aria-label="More tasks" className="mt-4 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks size={16} className="text-accent-cyan" /> More Tasks
        </h2>
        <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-input/30 py-8 text-center">
          <Clock size={24} className="mx-auto text-muted-foreground/60" />
          <p className="mt-2 text-xs text-muted-foreground">More earning tasks coming soon.</p>
        </div>
      </section>

      <section aria-label="Earnings history" className="mt-4 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-foreground">Earnings History</h2>
        {txs.length === 0 ? (
          <p className="mt-3 text-center py-6 text-xs text-muted-foreground">No earnings yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {txs.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-input/40 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium capitalize text-foreground">{tx.type.replace("_", " ")}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <span className="text-sm font-semibold text-accent-cyan">+{NGN(Number(tx.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
