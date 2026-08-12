import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Send, Mail, Clock } from "lucide-react";
import { seo, SITE } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => seo({ title: "Support & Help — Keppta Investment", path: "/support", noindex: true }),
  component: SupportPage,
});

function SupportPage() {
  const channels = [
    { icon: <MessageCircle size={20} />, name: "WhatsApp",
      desc: "Fastest response, 24/7", href: SITE.support.whatsapp, cta: "Chat on WhatsApp" },
    { icon: <Send size={20} />, name: "Telegram",
      desc: "Community & announcements", href: SITE.support.telegram, cta: "Open Telegram" },
    { icon: <Mail size={20} />, name: "Email",
      desc: "For formal requests", href: `mailto:${SITE.support.email}`, cta: SITE.support.email },
  ];
  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">We're here to help. Reach us on any channel below.</p>
      </header>

      <div className="mt-5 space-y-3">
        {channels.map((c) => (
          <a key={c.name} href={c.href} target="_blank" rel="noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl transition hover:border-accent-cyan/50">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-accent-cyan">{c.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
            <span className="text-[11px] font-semibold text-accent-cyan">{c.cta}</span>
          </a>
        ))}
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock size={16} className="text-accent-cyan" /> Support Hours
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Monday – Sunday, 08:00 – 22:00 (WAT). We aim to respond within 30 minutes on WhatsApp
          and within 24 hours by email.
        </p>
      </section>
    </>
  );
}
