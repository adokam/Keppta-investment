import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Shield, CheckCircle2, XCircle, Clock, Search, MessageCircle, RefreshCw, Wallet, Banknote,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NGN } from "@/lib/format";
import { seo, NGN_WA_NUMBER } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => seo({ title: "Admin - Keppta Investment", path: "/admin", noindex: true }),
  component: AdminPage,
});

type Tab = "pending" | "withdrawals" | "history" | "users";

interface DepositRow {
  id: string;
  user_id: string;
  amount: number;
  sender_reference: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  balance: number;
}

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/" });
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!data) {
        toast.error("Admin access only");
        navigate({ to: "/dashboard" });
        return;
      }
      setIsAdmin(true);
      setChecking(false);
    })();
  }, [navigate]);

  if (checking || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Checking access...
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-accent-cyan" />
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Admin
          </h1>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-4 gap-1 rounded-2xl border border-border bg-card/60 p-1 backdrop-blur-xl">
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>Deposits</TabBtn>
        <TabBtn active={tab === "withdrawals"} onClick={() => setTab("withdrawals")}>Withdraw</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>History</TabBtn>
        <TabBtn active={tab === "users"} onClick={() => setTab("users")}>Users</TabBtn>
      </div>

      <div className="mt-4">
        {tab === "pending" && <PendingDeposits />}
        {tab === "withdrawals" && <PendingWithdrawals />}
        {tab === "history" && <DepositHistory />}
        {tab === "users" && <UsersTab />}
      </div>
    </>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-xl py-2.5 text-xs font-semibold transition " +
        (active ? "text-primary-foreground" : "text-muted-foreground")
      }
      style={active ? { background: "var(--gradient-btn)" } : undefined}
    >
      {children}
    </button>
  );
}

function useProfilesById(ids: string[]) {
  const [map, setMap] = useState<Record<string, Profile>>({});
  useEffect(() => {
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, phone, email, balance")
        .in("id", ids);
      const next: Record<string, Profile> = {};
      for (const p of (data as Profile[]) ?? []) next[p.id] = p;
      setMap(next);
    })();
  }, [ids.join(",")]);
  return map;
}

function PendingDeposits() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<DepositRow | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("deposit_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRows((data as DepositRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    const channel = supabase
      .channel("deposit_requests_pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, load)
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, []);

  const ids = useMemo(() => rows.map((r) => r.user_id), [rows]);
  const users = useProfilesById(ids);

  const approve = async (row: DepositRow) => {
    setBusy(row.id);
    const { data, error } = await supabase.rpc("admin_review_deposit", {
      _id: row.id,
      _approve: true,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; reason?: string };
    if (!res.ok) return toast.error(res.reason || "Unable to approve");
    toast.success(`Approved ${NGN(Number(row.amount))}`);
    load();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading..." : `${rows.length} pending`}
        </p>
        <button
          onClick={load}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur-xl">
          <CheckCircle2 size={28} className="mx-auto text-emerald-300" />
          <p className="mt-2 text-sm text-muted-foreground">No pending deposits.</p>
        </div>
      )}

      {rows.map((row) => {
        const user = users[row.user_id];
        return (
          <article
            key={row.id}
            className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  {NGN(Number(row.amount))}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-200">
                <Clock size={11} /> Pending
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-border/60 bg-input/30 p-3 text-[12px]">
              <div className="grid grid-cols-2 gap-2">
                <Field label="User">{user?.username ?? "..."}</Field>
                <Field label="Phone">{user?.phone ?? "-"}</Field>
                <Field label="Email">
                  <span className="truncate">{user?.email ?? "-"}</span>
                </Field>
                <Field label="Wallet">{user ? NGN(Number(user.balance)) : "..."}</Field>
              </div>
              <div className="mt-2 border-t border-border/60 pt-2">
                <Field label="Sender / bank">{row.sender_reference || "not provided"}</Field>
                <Field label="Deposit ID">
                  <span className="font-mono">{row.id.slice(0, 8)}</span>
                </Field>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {user?.phone && (
                <a
                  href={`https://wa.me/${user.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300"
                >
                  <MessageCircle size={12} /> WhatsApp user
                </a>
              )}
              <button
                onClick={() => setRejecting(row)}
                disabled={busy === row.id}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-400/40 bg-red-500/10 py-2 text-xs font-semibold text-red-200 disabled:opacity-50"
              >
                <XCircle size={13} /> Reject
              </button>
              <button
                onClick={() => approve(row)}
                disabled={busy === row.id}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-btn)" }}
              >
                <CheckCircle2 size={13} /> {busy === row.id ? "..." : "Approve"}
              </button>
            </div>
          </article>
        );
      })}

      {rejecting && (
        <RejectModal
          row={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            load();
          }}
        />
      )}
    </section>
  );
}

function RejectModal({
  row, onClose, onDone,
}: { row: DepositRow; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_review_deposit", {
      _id: row.id,
      _approve: false,
      _note: note.trim() || undefined,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean };
    if (!res.ok) return toast.error("Unable to reject");
    toast.success("Deposit rejected");
    onDone();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Reject {NGN(Number(row.amount))} deposit?
        </h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Add a short reason so the user understands why.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={200}
          placeholder="e.g. No payment received on our end"
          className="mt-3 w-full rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent-cyan"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-xs font-semibold text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-lg border border-red-400/40 bg-red-500/20 py-2.5 text-xs font-semibold text-red-100 disabled:opacity-50"
          >
            {busy ? "..." : "Confirm reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DepositHistory() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [filter, setFilter] = useState<"all" | "approved" | "rejected">("all");

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("deposit_requests")
        .select("*")
        .neq("status", "pending")
        .order("reviewed_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      setRows((data as DepositRow[]) ?? []);
    })();
  }, [filter]);

  const ids = useMemo(() => rows.map((r) => r.user_id), [rows]);
  const users = useProfilesById(ids);

  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        {(["all", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full border px-3 py-1 text-[11px] font-semibold capitalize transition " +
              (filter === f
                ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                : "border-border text-muted-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="rounded-2xl border border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          No records.
        </p>
      )}
      {rows.map((row) => {
        const user = users[row.user_id];
        return (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3 text-xs"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{NGN(Number(row.amount))}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.username ?? "..."} • {row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString() : ""}
              </p>
              {row.admin_note && (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">Note: {row.admin_note}</p>
              )}
            </div>
            <span
              className={
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
                (row.status === "approved"
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                  : "border-red-400/40 bg-red-400/10 text-red-200")
              }
            >
              {row.status}
            </span>
          </div>
        );
      })}
    </section>
  );
}

function UsersTab() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const like = `%${term}%`;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, phone, email, balance")
        .or(`username.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
        .limit(20);
      setResults((data as Profile[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <section className="space-y-3">
      <label className="relative block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username, phone, or email"
          className="w-full rounded-xl border border-border bg-input/40 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent-cyan"
        />
      </label>

      {!selected && (
        <ul className="space-y-2">
          {results.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelected(p)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card/60 p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.username}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{p.email || p.phone || "-"}</p>
                </div>
                <span className="text-sm font-bold text-accent-cyan">{NGN(Number(p.balance))}</span>
              </button>
            </li>
          ))}
          {q.trim().length >= 2 && results.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">No users match.</p>
          )}
        </ul>
      )}

      {selected && (
        <UserDetail user={selected} onBack={() => setSelected(null)} onChanged={(next) => setSelected(next)} />
      )}
    </section>
  );
}

function UserDetail({
  user, onBack, onChanged,
}: { user: Profile; onBack: () => void; onChanged: (u: Profile) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"credit" | "debit">("credit");

  const adjust = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Enter an amount");
    setBusy(true);
    const signed = mode === "credit" ? n : -n;
    const { data, error } = await supabase.rpc("admin_adjust_wallet", {
      _user_id: user.id,
      _amount: signed,
      _note: note.trim() || undefined,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; new_balance?: number };
    if (!res.ok) return toast.error("Unable to adjust");
    toast.success(`Wallet updated. New balance ${NGN(Number(res.new_balance ?? 0))}`);
    onChanged({ ...user, balance: Number(res.new_balance ?? user.balance) });
    setAmount("");
    setNote("");
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-[11px] text-muted-foreground underline">
        Back to search
      </button>

      <div className="rounded-2xl border border-border bg-card/60 p-4">
        <p className="text-sm font-semibold text-foreground">{user.username}</p>
        <p className="text-[11px] text-muted-foreground">{user.email || user.phone || "-"}</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-input/40 px-3 py-2.5">
          <Wallet size={14} className="text-accent-cyan" />
          <p className="text-lg font-bold text-foreground">{NGN(Number(user.balance))}</p>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setMode("credit")}
            className={
              "flex-1 rounded-lg py-2 text-[11px] font-semibold " +
              (mode === "credit"
                ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : "border border-border text-muted-foreground")
            }
          >
            Credit
          </button>
          <button
            onClick={() => setMode("debit")}
            className={
              "flex-1 rounded-lg py-2 text-[11px] font-semibold " +
              (mode === "debit"
                ? "border border-red-400/40 bg-red-500/10 text-red-200"
                : "border border-border text-muted-foreground")
            }
          >
            Debit
          </button>
        </div>

        <input
          type="number"
          inputMode="numeric"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-accent-cyan"
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          className="mt-2 w-full rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent-cyan"
        />

        <button
          onClick={adjust}
          disabled={busy}
          className="mt-3 w-full rounded-lg py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-btn)" }}
        >
          {busy ? "..." : mode === "credit" ? "Credit wallet" : "Debit wallet"}
        </button>

        {user.phone && (
          <a
            href={`https://wa.me/${user.phone.replace(/\D/g, "") || NGN_WA_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 py-2 text-[11px] font-semibold text-emerald-300"
          >
            <MessageCircle size={12} /> WhatsApp {user.username}
          </a>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-0.5 truncate text-[12px] font-semibold text-foreground">{children}</div>
    </div>
  );
}

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function PendingWithdrawals() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<WithdrawalRow | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRows((data as WithdrawalRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    const channel = supabase
      .channel("withdrawal_requests_pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, load)
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, []);

  const ids = useMemo(() => rows.map((r) => r.user_id), [rows]);
  const users = useProfilesById(ids);

  const approve = async (row: WithdrawalRow) => {
    setBusy(row.id);
    const { data, error } = await supabase.rpc("admin_review_withdrawal", {
      _id: row.id,
      _approve: true,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; reason?: string };
    if (!res.ok) return toast.error(res.reason || "Unable to approve");
    toast.success(`Approved payout of ${NGN(Number(row.amount))}`);
    load();
  };

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v);
    toast.success(`${label} copied`);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading..." : `${rows.length} pending withdrawal${rows.length === 1 ? "" : "s"}`}
        </p>
        <button
          onClick={load}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur-xl">
          <CheckCircle2 size={28} className="mx-auto text-emerald-300" />
          <p className="mt-2 text-sm text-muted-foreground">No pending withdrawals.</p>
        </div>
      )}

      {rows.map((row) => {
        const user = users[row.user_id];
        return (
          <article key={row.id} className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  <Banknote size={16} className="text-accent-cyan" /> {NGN(Number(row.amount))}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-200">
                <Clock size={11} /> Pending
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-border/60 bg-input/30 p-3 text-[12px]">
              <div className="grid grid-cols-2 gap-2">
                <Field label="User">{user?.username ?? "..."}</Field>
                <Field label="Phone">{user?.phone ?? "-"}</Field>
                <Field label="Email"><span className="truncate">{user?.email ?? "-"}</span></Field>
                <Field label="Wallet after">{user ? NGN(Number(user.balance)) : "..."}</Field>
              </div>
              <div className="mt-2 border-t border-border/60 pt-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Field label="Bank">{row.bank_name}</Field>
                  <button onClick={() => copy(row.bank_name, "Bank")} className="rounded border border-border px-2 py-0.5 text-[10px]">Copy</button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Field label="Account number"><span className="font-mono tracking-widest">{row.account_number}</span></Field>
                  <button onClick={() => copy(row.account_number, "Account number")} className="rounded border border-border px-2 py-0.5 text-[10px]">Copy</button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Field label="Account name">{row.account_name}</Field>
                  <button onClick={() => copy(row.account_name, "Account name")} className="rounded border border-border px-2 py-0.5 text-[10px]">Copy</button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {user?.phone && (
                <a
                  href={`https://wa.me/${user.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300"
                >
                  <MessageCircle size={12} /> WhatsApp user
                </a>
              )}
              <button
                onClick={() => setRejecting(row)}
                disabled={busy === row.id}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-400/40 bg-red-500/10 py-2 text-xs font-semibold text-red-200 disabled:opacity-50"
              >
                <XCircle size={13} /> Reject & refund
              </button>
              <button
                onClick={() => approve(row)}
                disabled={busy === row.id}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-btn)" }}
              >
                <CheckCircle2 size={13} /> {busy === row.id ? "..." : "Mark paid"}
              </button>
            </div>
          </article>
        );
      })}

      {rejecting && (
        <RejectWithdrawalModal
          row={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => { setRejecting(null); load(); }}
        />
      )}
    </section>
  );
}

function RejectWithdrawalModal({
  row, onClose, onDone,
}: { row: WithdrawalRow; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_review_withdrawal", {
      _id: row.id,
      _approve: false,
      _note: note.trim() || undefined,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean };
    if (!res.ok) return toast.error("Unable to reject");
    toast.success(`Rejected. ${NGN(Number(row.amount))} refunded to user`);
    onDone();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Reject {NGN(Number(row.amount))} withdrawal?
        </h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          The exact amount will be refunded to the user's earnings balance.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={200}
          placeholder="Reason (visible to user)"
          className="mt-3 w-full rounded-xl border border-border bg-input/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent-cyan"
        />
        <div className="mt-3 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 text-xs font-semibold text-foreground">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-lg border border-red-400/40 bg-red-500/20 py-2.5 text-xs font-semibold text-red-100 disabled:opacity-50"
          >
            {busy ? "..." : "Confirm reject & refund"}
          </button>
        </div>
      </div>
    </div>
  );
}

