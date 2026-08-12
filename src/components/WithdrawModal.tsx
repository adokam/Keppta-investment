import { useEffect, useState } from "react";
import { X, Banknote, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NGN } from "@/lib/format";
import { NG_BANKS } from "@/lib/banks";

interface WithdrawRow {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
}

const MIN_WITHDRAW = 100;

export function WithdrawModal({
  walletBalance,
  hasActiveInvestment,
  onClose,
  onChanged,
}: {
  walletBalance: number;
  hasActiveInvestment: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<WithdrawRow[]>([]);

  const loadHistory = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("id, amount, bank_name, account_number, account_name, status, admin_note, created_at")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setHistory((data as WithdrawRow[]) ?? []);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const submit = async () => {
    const n = Number(amount);
    if (!n || n < MIN_WITHDRAW) return toast.error(`Minimum withdrawal is ${NGN(MIN_WITHDRAW)}`);
    if (n > walletBalance) return toast.error("Amount exceeds your wallet balance");
    if (!bank) return toast.error("Select your bank");
    if (!/^\d{10}$/.test(accountNumber.trim())) return toast.error("Enter a valid 10 digit account number");
    if (accountName.trim().length < 2) return toast.error("Enter the account name");

    setBusy(true);
    const { data, error } = await supabase.rpc("create_withdrawal_request", {
      _amount: n,
      _bank_name: bank,
      _account_number: accountNumber.trim(),
      _account_name: accountName.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; reason?: string };
    if (!res.ok) {
      if (res.reason === "no_active_investment") {
        return toast.error("Deposit and buy at least one product to unlock withdrawals");
      }
      if (res.reason === "insufficient_balance") {
        return toast.error("Insufficient wallet balance");
      }
      return toast.error("Unable to submit withdrawal");
    }
    toast.success("Withdrawal submitted. Awaiting admin approval.");
    setAmount("");
    setAccountNumber("");
    setAccountName("");
    onChanged();
    loadHistory();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="my-4 w-full max-w-md rounded-2xl border border-border bg-card p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            <Banknote size={18} className="text-accent-cyan" /> Withdraw funds
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted/40" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!hasActiveInvestment ? (
          <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-300" />
              <div>
                <p className="text-sm font-semibold text-yellow-100">Deposit & buy a product first</p>
                <p className="mt-1 text-[12px] leading-relaxed text-yellow-100/80">
                  Withdrawals unlock once you own at least one product. Make a deposit, buy any VIP product, and you can then withdraw any amount from your wallet.
                </p>
              </div>
            </div>
            <Link
              to="/invest"
              onClick={onClose}
              className="mt-3 flex w-full items-center justify-center rounded-lg py-2.5 text-xs font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-btn)" }}
            >
              Go to Invest
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-input/40 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Wallet balance</p>
              <p className="mt-0.5 text-2xl font-bold text-accent-cyan" style={{ fontFamily: "var(--font-display)" }}>
                {NGN(walletBalance)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Withdraw any amount up to your full wallet balance. Minimum {NGN(MIN_WITHDRAW)}.
              </p>
              <button
                type="button"
                onClick={() => setAmount(String(walletBalance))}
                className="mt-2 rounded-lg border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-accent-cyan"
              >
                Withdraw all
              </button>
            </div>

            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Amount
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-3 text-base font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-accent-cyan"
            />

            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Bank
            </label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-3 text-sm text-foreground outline-none focus:border-accent-cyan"
            >
              <option value="">Select your bank</option>
              {NG_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Account number
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="10 digits"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-3 text-sm tracking-widest text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-accent-cyan"
            />

            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Account name
            </label>
            <input
              type="text"
              placeholder="As registered with your bank"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-accent-cyan"
            />

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              The amount is deducted from your wallet immediately. If admin rejects the request, the exact amount is refunded to your wallet.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-border py-2.5 text-xs font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="flex-1 rounded-lg py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                style={{ background: "var(--gradient-btn)" }}
              >
                {busy ? "Submitting..." : "Submit withdrawal"}
              </button>
            </div>
          </>
        )}

        {history.length > 0 && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your recent withdrawals
            </p>
            <ul className="space-y-2">
              {history.map((row) => (
                <li key={row.id} className="rounded-lg border border-border/60 bg-input/30 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{NGN(Number(row.amount))}</p>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {row.bank_name} • {row.account_number} • {new Date(row.created_at).toLocaleString()}
                  </p>
                  {row.admin_note && (
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">Note: {row.admin_note}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WithdrawRow["status"] }) {
  const map = {
    pending: { label: "Pending", icon: <Clock size={11} />, cls: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200" },
    approved: { label: "Paid", icon: <CheckCircle2 size={11} />, cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" },
    rejected: { label: "Rejected", icon: <XCircle size={11} />, cls: "border-red-400/40 bg-red-400/10 text-red-200" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}
