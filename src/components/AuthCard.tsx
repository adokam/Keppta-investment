import type { ReactNode } from "react";
import logo from "@/assets/keppta-logo.png";

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card/70 p-8 backdrop-blur-xl"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex flex-col items-center">
          <img
            src={logo}
            alt="Keppta"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover"
          />
          <h1
            className="mt-5 text-3xl tracking-wide text-foreground"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Keppta</p>
        </div>
        <div className="mt-8 space-y-4">{children}</div>
      </div>
    </div>
  );
}

interface FieldProps {
  icon: ReactNode;
  type?: string;
  placeholder: string;
  name: string;
  trailing?: ReactNode;
  defaultValue?: string;
}

export function Field({ icon, type = "text", placeholder, name, trailing, defaultValue }: FieldProps) {
  return (
    <div className="relative flex items-center gap-2 rounded-xl border border-border bg-input/60 px-4 py-1 transition focus-within:border-accent-cyan/60 focus-within:ring-2 focus-within:ring-accent-cyan/20">
      <span className="shrink-0 text-accent-cyan">{icon}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "off"}
        className="min-w-0 flex-1 bg-transparent py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
      />
      {trailing && <span className="shrink-0 text-muted-foreground">{trailing}</span>}
    </div>
  );
}

export function PrimaryButton({ children, type = "submit" }: { children: ReactNode; type?: "submit" | "button" }) {
  return (
    <button
      type={type}
      className="w-full rounded-xl py-3.5 text-base font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.99]"
      style={{ background: "var(--gradient-btn)" }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "submit" | "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-transparent py-3.5 text-sm text-foreground/90 transition hover:bg-muted/40"
    >
      {children}
    </button>
  );
}
