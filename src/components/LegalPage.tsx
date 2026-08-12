import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-16 pt-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to Kamdan
      </Link>
      <header className="mt-4 border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: {updated}</p>
      </header>
      <article className="prose prose-invert mt-6 max-w-none text-sm leading-relaxed text-foreground/90
        [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground
        [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground
        [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1
        [&_a]:text-accent-cyan [&_a]:underline">
        {children}
      </article>
    </main>
  );
}
