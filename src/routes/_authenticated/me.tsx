import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LogOut, User, Gift, ChevronRight, HelpCircle, FileText,
  Shield, ScrollText, MessageCircle, Sun, Moon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/kamdan-logo.png";
import { seo } from "@/lib/site";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => seo({ title: "My Profile — Kamdan", path: "/me", noindex: true }),
  component: MePage,
});

interface Profile { username: string; referral_code: string; vip_level: number; }

function MePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const [{ data: p }, { data: role }] = await Promise.all([
        supabase.from("profiles").select("username, referral_code, vip_level")
          .eq("id", u.user.id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
      ]);
      if (p) setProfile(p as Profile);
      setIsAdmin(Boolean(role));
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Me</h1>
      </header>

      <section aria-label="Profile summary"
        className="mt-5 flex items-center gap-4 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <img src={logo} alt="Avatar" width={56} height={56} className="h-14 w-14 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{profile?.username || "User"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <p className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
            VIP {profile?.vip_level ?? 0}
          </p>
        </div>
      </section>

      <section aria-label="Appearance" className="mt-4 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Appearance</p>
            <p className="text-[11px] text-muted-foreground">Switch between dark and light theme.</p>
          </div>
          <div className="flex items-center rounded-full border border-border bg-input/40 p-1">
            <button
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              className={"flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition " +
                (theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              <Moon size={12} /> Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              className={"flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition " +
                (theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              <Sun size={12} /> Light
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Account" className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
        <Row to="/referral" icon={<Gift size={18} />} title="Referral" subtitle="Invite friends and earn commission" highlight />
        <Row to="/support" icon={<HelpCircle size={18} />} title="Support" subtitle="WhatsApp, Telegram, Email" />
        {isAdmin && (
          <Row to="/admin" icon={<Shield size={18} />} title="Admin Panel" subtitle="Review deposits and adjust wallets" highlight />
        )}
      </section>

      <section aria-label="Legal" className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
        <Row to="/legal/terms" icon={<FileText size={18} />} title="Terms of Service" />
        <Row to="/legal/privacy" icon={<Shield size={18} />} title="Privacy Policy" />
        <Row to="/legal/refund" icon={<ScrollText size={18} />} title="Refund Policy" />
        <Row to="/legal/disclaimer" icon={<MessageCircle size={18} />} title="Risk Disclaimer" />
        <Row to="/legal/aml" icon={<User size={18} />} title="AML / KYC Policy" />
      </section>

      <button
        onClick={signOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-3.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20"
      >
        <LogOut size={16} /> Sign out
      </button>
    </>
  );
}

function Row({ to, icon, title, subtitle, highlight = false }: {
  to: string; icon: React.ReactNode; title: string; subtitle?: string; highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5 last:border-0 transition hover:bg-input/40"
    >
      <span className={"flex h-9 w-9 items-center justify-center rounded-full " +
        (highlight ? "bg-primary/15 text-accent-cyan" : "bg-input/60 text-muted-foreground")}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </Link>
  );
}
