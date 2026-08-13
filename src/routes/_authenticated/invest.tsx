import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Clock, CheckCircle2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NGN } from "@/lib/format";
import { seo } from "@/lib/site";

import vip1 from "@/assets/vip/vip1.jpg";
import vip2 from "@/assets/vip/vip2.jpg";
import vip3 from "@/assets/vip/vip3.jpg";
import vip4 from "@/assets/vip/vip4.jpg";
import vip5 from "@/assets/vip/vip5.jpg";
import vip6 from "@/assets/vip/vip6.jpg";
import vip7 from "@/assets/vip/vip7.jpg";
import vip8 from "@/assets/vip/vip8.jpg";
import vip9 from "@/assets/vip/vip9.jpg";
import vip10 from "@/assets/vip/vip10.jpg";

export const Route = createFileRoute("/_authenticated/invest")({
  head: () => seo({ title: "Invest - VIP Products | Keppta Investment", path: "/invest", noindex: true }),
  component: InvestPage,
});

const IMAGES: Record<string, string> = {
  vip1, vip2, vip3, vip4, vip5, vip6, vip7, vip8, vip9, vip10,
};

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  daily_profit: number;
  image_key: string;
}

interface Investment {
  id: string;
  product_id: number;
  price: number;
  daily_profit: number;
  status: "pending" | "active" | "rejected" | "cancelled";
  approved_at: string | null;
  last_claim_at: string | null;
  total_claimed: number;
  created_at: string;
}

function InvestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [tab, setTab] = useState<"products" | "mine">("products");
  const [buying, setBuying] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    const [{ data: p }, { data: inv }, { data: prof }] = await Promise.all([
      supabase.from("vip_products").select("*").order("id"),
      supabase.from("user_investments").select("*").order("created_at", { ascending: false }),
      u.user
        ? supabase.from("profiles").select("balance").eq("id", u.user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setProducts((p as Product[]) ?? []);
    setInvestments((inv as Investment[]) ?? []);
    if (prof) setBalance(Number((prof as { balance: number }).balance ?? 0));
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = investments.filter((i) => i.status === "active").length;

  const submitOrder = async () => {
    if (!buying) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("create_investment_order", { _product_id: buying.id });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const res = data as { ok: boolean; reason?: string; balance?: number; price?: number };
    if (!res.ok) {
      if (res.reason === "insufficient_balance") {
        toast.error(`Insufficient balance. Please deposit first.`);
      } else {
        toast.error("Unable to complete purchase.");
      }
      return;
    }
    await load();
    setBuying(null);
    setTab("mine");
    toast.success("VIP activated! Come back in 24 hours to claim your first profit.");
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Invest
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buy a VIP product and claim daily profit every 24 hours.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="shrink-0 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] font-semibold text-foreground"
        >
          <Wallet size={12} className="mr-1 inline" />
          {NGN(balance)}
        </Link>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card/60 p-1 backdrop-blur-xl">
        <TabBtn active={tab === "products"} onClick={() => setTab("products")}>VIP Products</TabBtn>
        <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>
          My Investments{activeCount ? ` (${activeCount})` : ""}
        </TabBtn>
      </div>

      {tab === "products" ? (
        <section className="mt-4 space-y-3">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} onBuy={() => setBuying(p)} />
          ))}
        </section>
      ) : (
        <section className="mt-4 space-y-3">
          {investments.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur-xl">
              <p className="text-sm text-muted-foreground">You have no investments yet.</p>
              <button
                onClick={() => setTab("products")}
                className="mt-3 rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-btn)" }}
              >
                Browse VIP products
              </button>
            </div>
          ) : (
            investments.map((inv) => {
              const product = products.find((p) => p.id === inv.product_id);
              return (
                <InvestmentCard
                  key={inv.id}
                  inv={inv}
                  product={product}
                  onClaimed={load}
                />
              );
            })
          )}
        </section>
      )}

      {buying && (
        <BuyModal
          product={buying}
          balance={balance}
          loading={loading}
          onConfirm={submitOrder}
          onClose={() => setBuying(null)}
        />
      )}
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

function ProductCard({ p, onBuy }: { p: Product; onBuy: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
      <div className="flex gap-3 p-3">
        <img
          src={IMAGES[p.image_key]}
          alt={p.name}
          loading="lazy"
          width={112}
          height={112}
          className="h-28 w-28 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"
              style={{ background: "var(--gradient-btn)" }}
            >
              VIP {p.id}
            </span>
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{p.name}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="uppercase tracking-wider text-muted-foreground">Price</p>
              <p className="font-bold text-foreground">{NGN(p.price)}</p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-muted-foreground">Daily</p>
              <p className="font-bold text-accent-cyan">{NGN(p.daily_profit)}</p>
            </div>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground"
            >
              {open ? "Hide" : "Details"}
            </button>
            <button
              onClick={onBuy}
              className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-btn)" }}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
      {open && (
        <p className="border-t border-border/60 bg-input/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {p.description}
        </p>
      )}
    </article>
  );
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function InvestmentCard({
  inv, product, onClaimed,
}: {
  inv: Investment; product?: Product; onClaimed: () => void;
}) {
  const [claiming, setClaiming] = useState(false);
  const now = useNow(1000);

  const nextClaimAt = useMemo(() => {
    if (inv.status !== "active") return null;
    const base = inv.last_claim_at ?? inv.approved_at;
    if (!base) return null;
    return new Date(base).getTime() + 24 * 60 * 60 * 1000;
  }, [inv]);

  const canClaim = nextClaimAt !== null && now >= nextClaimAt;
  const countdown = nextClaimAt !== null ? nextClaimAt - now : 0;

  const claim = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_investment_profit", { _investment_id: inv.id });
    setClaiming(false);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; reason?: string; amount?: number };
    if (!res.ok) return toast.error(res.reason === "too_soon" ? "Come back in 24 hours." : "Unable to claim.");
    toast.success(`Claimed ${NGN(res.amount ?? 0)}!`);
    onClaimed();
  };

  return (
    <article className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
      <div className="flex gap-3">
        {product && (
          <img
            src={IMAGES[product.image_key]}
            alt={product.name}
            loading="lazy"
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              VIP {inv.product_id}{product ? ` - ${product.name}` : ""}
            </h3>
            <StatusBadge status={inv.status} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <Meta label="Price" value={NGN(inv.price)} />
            <Meta label="Daily" value={NGN(inv.daily_profit)} tone="cyan" />
            <Meta label="Claimed" value={NGN(inv.total_claimed)} />
          </div>
        </div>
      </div>

      {inv.status === "pending" && (
        <p className="mt-3 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-[11px] text-yellow-200">
          Awaiting admin confirmation.
        </p>
      )}


      {inv.status === "active" && (
        <div className="mt-3">
          <button
            onClick={claim}
            disabled={!canClaim || claiming}
            className={
              "flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition " +
              (canClaim
                ? "text-primary-foreground"
                : "cursor-not-allowed border border-border bg-input/40 text-muted-foreground")
            }
            style={canClaim ? { background: "var(--gradient-btn)" } : undefined}
          >
            {canClaim ? (
              <>
                <CheckCircle2 size={14} /> Claim {NGN(inv.daily_profit)}
              </>
            ) : (
              <>
                <Clock size={14} /> Next claim in {formatCountdown(countdown)}
              </>
            )}
          </button>
        </div>
      )}

      {inv.status === "rejected" && (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-[11px] text-red-200">
          This order was rejected. Please contact support.
        </p>
      )}
    </article>
  );
}

function Meta({ label, value, tone }: { label: string; value: string; tone?: "cyan" }) {
  return (
    <div>
      <p className="uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={"font-bold " + (tone === "cyan" ? "text-accent-cyan" : "text-foreground")}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Investment["status"] }) {
  const map = {
    pending: { label: "Payment Pending", cls: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200" },
    active: { label: "Active", cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" },
    rejected: { label: "Rejected", cls: "border-red-400/40 bg-red-400/10 text-red-200" },
    cancelled: { label: "Cancelled", cls: "border-border bg-input/40 text-muted-foreground" },
  } as const;
  const s = map[status];
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`;
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 backdrop-blur-xl"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted/40">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BuyModal({
  product, balance, loading, onConfirm, onClose,
}: {
  product: Product; balance: number; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const enough = balance >= product.price;
  return (
    <Modal title={`Buy VIP ${product.id}`} onClose={onClose}>
      <img
        src={IMAGES[product.image_key]}
        alt={product.name}
        className="mb-3 h-40 w-full rounded-xl object-cover"
      />
      <h4 className="text-sm font-semibold text-foreground">{product.name}</h4>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-input/40 p-3 text-xs">
        <div>
          <p className="uppercase tracking-wider text-muted-foreground">Price</p>
          <p className="mt-0.5 font-bold text-foreground">{NGN(product.price)}</p>
        </div>
        <div>
          <p className="uppercase tracking-wider text-muted-foreground">Daily profit</p>
          <p className="mt-0.5 font-bold text-accent-cyan">{NGN(product.daily_profit)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-input/40 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Wallet balance</p>
          <p className={"mt-0.5 text-sm font-bold " + (enough ? "text-accent-cyan" : "text-red-300")}>
            {NGN(balance)}
          </p>
        </div>
        {!enough && (
          <span className="rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-200">
            Insufficient
          </span>
        )}
      </div>

      {!enough ? (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          You need {NGN(product.price - balance)} more. Go to Home and tap Deposit to fund your wallet.
        </p>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {NGN(product.price)} will be deducted from your wallet. Your VIP activates immediately and the 24 hour claim
          timer starts right away.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg border border-border py-2.5 text-xs font-semibold text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading || !enough}
          className="flex-1 rounded-lg py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-btn)" }}
        >
          {loading ? "Processing..." : enough ? "Confirm purchase" : "Deposit needed"}
        </button>
      </div>
    </Modal>
  );
}

