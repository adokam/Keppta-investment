import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { seo, SITE } from "@/lib/site";

export const Route = createFileRoute("/legal/refund")({
  head: () => seo({
    title: "Refund Policy — Keppta Investment",
    description: "Keppta Investment's refund and cancellation policy for deposits and investments.",
    path: "/legal/refund",
  }),
  component: () => (
    <LegalPage title="Refund Policy" updated="July 12, 2026">
      <h2>1. Deposits</h2>
      <p>Deposits credited to your Keppta Investment balance are non-refundable once used to purchase investment plans or converted through internal features.</p>

      <h2>2. Failed Transactions</h2>
      <p>If your deposit is debited but not credited to your Keppta Investment balance within 24 hours, contact support with proof of payment for a full reconciliation.</p>

      <h2>3. Unused Balance</h2>
      <p>You may withdraw any unused, unearned balance subject to our withdrawal minimums and processing times.</p>

      <h2>4. Investment Plans</h2>
      <p>Once an investment plan is activated, principal and returns are locked for the term specified. Early termination may forfeit accrued returns.</p>

      <h2>5. How to Request</h2>
      <p>Email <a href={`mailto:${SITE.support.email}`}>{SITE.support.email}</a> with your username, transaction reference, and reason. We respond within 3 business days.</p>

      <h2>6. Chargebacks</h2>
      <p>Filing a chargeback without contacting support first may result in permanent account suspension.</p>
    </LegalPage>
  ),
});
