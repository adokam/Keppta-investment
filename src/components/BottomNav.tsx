import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, TrendingUp, User } from "lucide-react";
import type { ReactNode } from "react";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/task", label: "Task", icon: ListChecks },
  { to: "/invest", label: "Invest", icon: TrendingUp },
  { to: "/me", label: "Me", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to === "/dashboard" && pathname === "/dashboard");
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition " +
                  (active ? "text-accent-cyan" : "text-muted-foreground hover:text-foreground")
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-28 pt-6">
      {children}
      <BottomNav />
    </div>
  );
}
