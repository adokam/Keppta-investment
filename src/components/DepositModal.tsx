import { useEffect, useState } from "react";
import { X, Copy, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SITE, NGN_WA_NUMBER } from "@/lib/site";
import { NGN } from "@/lib/format";

interface DepositRow {
  id: string;
  amount: number;
  sender_reference: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
}

export function DepositModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string; amount: number; reference: string } | null>(null);
  const [history, setHistory] = useState<DepositRow[]>([]);
  const [username, setUsername] = useState<string>("");

  const loadHistory = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: rows }, { data: prof }] = await Promise.all([
      supabase
        .from("deposit_requests")
        .select("id, amount, sender_reference, status, admin_note, created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("profiles").select("username").eq("id", u.user.id).maybeSingle(),
    ]);
    setHistory((rows as DepositRow[]) ?? []);
    setUsername((prof as { username: string } | null)?.username ?? "");
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast.success(`${label} copied`);
  };

  const submit = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Enter the amount you paid");
    setLoading(true);
    const { data, error } = await supabase.rpc("create_deposit_request", {
      _amount: n,
      _sender_reference: reference.trim() || undefined,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; deposit_id?: string };
    if (!res.ok || !res.deposit_id) return toast.error("Unable to submit deposit");
    setSubmitted({ id: res.deposit_id, amount: n, reference: reference.trim() });
    onCreated();
    loadHistory();
  };

  const waMessage = submitted
    ? `Hello Keppta Investment Admin,%0A%0AI just made a deposit.%0A%0AUsername: ${encodeURIComponent(username)}%0AAmount: ${NGN(submitted.amount)}%0ASender/Ref: ${encodeURIComponent(submitted.reference || "n/a")}%0ADeposit ID: ${submitted.id.slice(0, 8)}%0A%0AScreenshot attached.`
    : `Hello Keppta Investment Admin, I made a deposit to Opay ${SITE.payment.accountNumber}. Please confirm.`;
  const waLink = `https://wa.me/${NGN_WA_NUMBER}?text=${waMessage}`;

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
          <h3
            className="text-base font-semibold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {submitted ? "Deposit submitted" : "Deposit to your wallet"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted/40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {!submitted ? (
          <>
            <ol className="space-y-1.5 rounded-xl border border-border bg-input/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
              <li>1. Copy the account details below.</li>
              <li>2. Pay any amount from your bank app to that account.</li>
              <li>3. Take a screenshot of the successful transfer.</li>
              <li>4. Enter the amount you paid and your sender name, then tap Submit.</li>
              <li>5. Send the screenshot to admin on WhatsApp for faster confirmation.</li>
            </ol>

            <div className="mt-3 space-y-2">
              <Row label="Bank" value={SITE.payment.bank} onCopy={() => copy(SITE.payment.bank, "Bank")} />
              <Row
                label="Account number"
                value={SITE.payment.accountNumber}
                onCopy={() => copy(SITE.payment.accountNumber, "Account number")}
                big
              />
              <Row
                label="Account name"
                value={SITE.payment.accountName}
                onCopy={() => copy(SITE.payment.accountName, "Account name")}
              />
            </div>

            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Amount paid
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
              Sender name / bank used (helps admin match your payment)
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe - GTBank"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded-xl border border-border bg-input/40 px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-accent-cyan"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-border py-2.5 text-xs font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 rounded-lg py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                style={{ background: "var(--gradient-btn)" }}
              >
                {loading ? "Submitting..." : "Submit deposit"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-emerald-200">Deposit added to the review queue</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-emerald-100/80">
                    We logged your {NGN(submitted.amount)} deposit. Send your payment screenshot to admin on WhatsApp so it can be confirmed faster. Your wallet updates as soon as admin approves it.
                  </p>
                </div>
              </div>
              <p className="mt-3 rounded-lg border border-emerald-400/20 bg-black/20 px-2.5 py-2 text-[11px] text-emerald-100/80">
                Deposit ID: <span className="font-mono">{submitted.id.slice(0, 8)}</span>
              </p>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 py-3 text-sm font-semibold text-emerald-300"
            >
              <ShieldCheck size={16} /> Send screenshot to admin on WhatsApp
            </a>

            <button
              onClick={onClose}
              className="mt-2 w-full rounded-lg border border-border py-2.5 text-xs font-semibold text-foreground"
            >
              Done
            </button>
          </>
        )}

        {history.length > 0 && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your recent deposits
            </p>
            <ul className="space-y-2">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-input/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{NGN(Number(row.amount))}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                      {row.sender_reference ? ` • ${row.sender_reference}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DepositRow["status"] }) {
  const map = {
    pending: { label: "Pending", icon: <Clock size={11} />, cls: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200" },
    approved: { label: "Approved", icon: <CheckCircle2 size={11} />, cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" },
    rejected: { label: "Rejected", icon: <XCircle size={11} />, cls: "border-red-400/40 bg-red-400/10 text-red-200" },
  } as const;
  const s = map[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}
    >
      {s.icon} {s.label}
    </span>
  );
}

function Row({ label, value, onCopy, big }: { label: string; value: string; onCopy: () => void; big?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-input/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={"mt-0.5 truncate font-bold text-foreground " + (big ? "text-lg tracking-widest" : "text-sm")}>
          {value}
        </p>
      </div>
      <button
        onClick={onCopy}
        className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground"
      >
        <Copy size={12} className="inline" /> Copy
      </button>
    </div>
  );
}
