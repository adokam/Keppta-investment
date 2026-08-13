import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/legal/disclaimer")({
  head: () => seo({
    title: "Risk Disclaimer - Keppta Investment",
    description: "Understand the risks of using Keppta Investment's investment and earning products.",
    path: "/legal/disclaimer",
  }),
  component: () => (
    <LegalPage title="Risk Disclaimer" updated="July 12, 2026">
      <p>The information on Keppta Investment is for general purposes only and does not constitute financial, investment, tax, or legal advice.</p>

      <h2>1. Investment Risk</h2>
      <p>All investments carry risk, including loss of principal. Past performance is not a guarantee of future returns. Only invest funds you can afford to lose.</p>

      <h2>2. No Guaranteed Earnings</h2>
      <p>Daily rewards and referral commissions depend on your engagement and platform activity. Amounts, rules, and eligibility may change without notice.</p>

      <h2>3. Third Parties</h2>
      <p>We rely on banks, payment gateways, and telecom providers. Keppta Investment is not responsible for outages, delays, or errors caused by these third parties.</p>

      <h2>4. Your Responsibility</h2>
      <p>You are responsible for tax reporting on any earnings from Keppta Investment under applicable Nigerian tax law.</p>

      <h2>5. No Warranty</h2>
      <p>The service is provided "as is" without warranties of any kind, express or implied.</p>
    </LegalPage>
  ),
});
