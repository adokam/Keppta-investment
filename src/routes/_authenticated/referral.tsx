import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Share2, Users, TrendingUp, Gift, MessageCircle, Send as TelegramIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NGN } from "@/lib/format";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/referral")({
  head: () => seo({ title: "Referral Program — Invite & Earn | Keppta Investment", path: "/referral", noindex: true }),
  component: ReferralPage,
});

interface Profile { referral_code: string; team_size: number; }
interface Referral { id: string; username: string; created_at: string; }

function ReferralPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Referral[]>([]);
  const [bonuses, setBonuses] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: p }, { data: refs }, { data: bx }] = await Promise.all([
        supabase.from("profiles").select("referral_code, team_size").eq("id", u.user.id).maybeSingle(),
        supabase.from("profiles").select("id, username, created_at").eq("referred_by", u.user.id)
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("transactions").select("amount").eq("user_id", u.user.id).eq("type", "referral_bonus"),
      ]);
      if (p) setProfile(p as Profile);
      setTeam((refs as Referral[]) ?? []);
      setBonuses(((bx as { amount: number }[]) ?? []).reduce((s, r) => s + Number(r.amount), 0));
    })();
  }, []);

  const link = profile ? `${window.location.origin}/register?code=${profile.referral_code}` : "";
  const shareText = `Join me on Keppta Investment — refer & earn ₦500 for every friend you invite. Sign up with my code: ${profile?.referral_code}`;

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast.success(`${label} copied!`);
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Keppta Investment", text: shareText, url: link }); } catch {}
    } else copy(link, "Link");
  };

  const enc = encodeURIComponent(`${shareText} ${link}`);

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Refer & Earn ₦500</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invite friends and earn a flat ₦500 bonus for every friend who joins with your code.</p>
      </header>

      <section aria-label="Referral overview" className="mt-5 grid grid-cols-2 gap-3">
        <Stat icon={<Users size={18} />} label="Team Size" value={String(profile?.team_size ?? 0)} />
        <Stat icon={<TrendingUp size={18} />} label="Bonus Earned" value={NGN(bonuses)} />
      </section>

      <section aria-label="Your code"
        className="mt-4 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Gift size={16} className="text-accent-cyan" /> Your Referral Code
        </div>

        <div className="mt-4 rounded-xl border border-border bg-input/60 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Code</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-2xl font-bold tracking-widest text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {profile?.referral_code ?? "…"}
            </p>
            <button onClick={() => copy(profile?.referral_code ?? "", "Code")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-btn)" }}>
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-border bg-input/60 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Link</p>
          <p className="mt-1 break-all text-xs text-foreground/90">{link || "…"}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => copy(link, "Link")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold">
              <Copy size={14} /> Copy link
            </button>
            <button onClick={share}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-btn)" }}>
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <a href={`https://wa.me/?text=${enc}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-foreground">
            <MessageCircle size={14} /> WhatsApp
          </a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-foreground">
            <TelegramIcon size={14} /> Telegram
          </a>
          <a href={`https://twitter.com/intent/tweet?text=${enc}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-foreground">
            X / Twitter
          </a>
        </div>
      </section>

      <section aria-label="How it works" className="mt-4 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-foreground">How it works</h2>
        <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
          <li><span className="font-semibold text-foreground">1.</span> Share your code or link with friends.</li>
          <li><span className="font-semibold text-foreground">2.</span> They register with your code.</li>
          <li><span className="font-semibold text-foreground">3.</span> You earn a flat <span className="font-semibold text-accent-cyan">₦500 bonus</span> once they activate their account.</li>
        </ol>
      </section>

      <section aria-label="Your team" className="mt-4 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-foreground">Your Team</h2>
        {team.length === 0 ? (
          <p className="mt-3 py-6 text-center text-xs text-muted-foreground">No referrals yet. Share your link!</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {team.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-input/40 px-3 py-2.5">
                <p className="text-sm font-medium">{r.username}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-accent-cyan">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
    </div>
  );
}
