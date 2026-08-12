import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { seo, SITE } from "@/lib/site";

export const Route = createFileRoute("/legal/aml")({
  head: () => seo({
    title: "AML & KYC Policy — Kamdan",
    description: "Kamdan's Anti-Money Laundering and Know-Your-Customer policy.",
    path: "/legal/aml",
  }),
  component: () => (
    <LegalPage title="AML & KYC Policy" updated="July 12, 2026">
      <p>{SITE.name} is committed to preventing money laundering, terrorism financing, and financial crime, in line with the Central Bank of Nigeria and EFCC guidelines.</p>

      <h2>1. Customer Identification (KYC)</h2>
      <p>We may require you to provide:</p>
      <ul>
        <li>A valid government-issued ID (NIN, BVN, driver's licence, or passport).</li>
        <li>A recent utility bill or bank statement for address verification.</li>
        <li>A selfie for liveness verification.</li>
      </ul>

      <h2>2. Ongoing Monitoring</h2>
      <p>We monitor transactions for unusual patterns and may request additional information at any time.</p>

      <h2>3. Prohibited Activity</h2>
      <ul>
        <li>Using proceeds of crime.</li>
        <li>Structuring transactions to avoid reporting thresholds.</li>
        <li>Financing terrorism or sanctioned entities.</li>
      </ul>

      <h2>4. Reporting</h2>
      <p>Suspicious activity is reported to the Nigerian Financial Intelligence Unit (NFIU) as required by law.</p>

      <h2>5. Cooperation</h2>
      <p>Failure to provide requested KYC documents may result in withdrawal delays or account closure.</p>

      <h2>6. Contact</h2>
      <p>Compliance queries: <a href={`mailto:${SITE.support.email}`}>{SITE.support.email}</a>.</p>
    </LegalPage>
  ),
});
