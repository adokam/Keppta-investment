import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { seo, SITE } from "@/lib/site";

export const Route = createFileRoute("/legal/terms")({
  head: () => seo({
    title: "Terms of Service - Keppta Investment",
    description: "Read the Keppta Investment Terms of Service governing use of our earning and investment platform.",
    path: "/legal/terms",
  }),
  component: () => (
    <LegalPage title="Terms of Service" updated="July 12, 2026">
      <p>Welcome to {SITE.name}. By creating an account or using our services, you agree to these Terms of Service ("Terms"). Please read them carefully.</p>

      <h2>1. Eligibility</h2>
      <p>You must be at least 18 years old and a legal resident of Nigeria (or a supported jurisdiction) to use Keppta Investment. By registering, you confirm the information you provide is accurate and complete.</p>

      <h2>2. Your Account</h2>
      <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately of any unauthorized use.</p>

      <h2>3. Earnings, Tasks & Rewards</h2>
      <ul>
        <li>Daily sign-in rewards (₦100 per day, ₦500 on day 7) are credited to your Keppta Investment balance upon successful check-in.</li>
        <li>Missing a day resets your streak.</li>
        <li>Reward amounts, tasks, and eligibility rules may change at our discretion.</li>
      </ul>

      <h2>4. Referral Program</h2>
      <p>You may earn commissions when users you refer engage with the platform. Fraudulent referrals (self-referrals, fake accounts, automated signups) will result in forfeiture of rewards and account suspension.</p>

      <h2>5. Deposits & Withdrawals</h2>
      <p>All deposits and withdrawals are processed in Nigerian Naira (₦). Processing times and minimum limits may apply. Keppta Investment is not liable for delays caused by third-party payment providers or banks.</p>

      <h2>6. Prohibited Conduct</h2>
      <ul>
        <li>Using bots, scripts, or automated tools to interact with the platform.</li>
        <li>Creating multiple accounts to abuse rewards.</li>
        <li>Money laundering, fraud, or any illegal activity.</li>
        <li>Attempting to access other users' accounts or our systems without authorization.</li>
      </ul>

      <h2>7. Suspension & Termination</h2>
      <p>We may suspend or terminate your account at any time for violations of these Terms, suspected fraud, or as required by law. Balances tied to fraudulent activity will not be paid out.</p>

      <h2>8. Disclaimer</h2>
      <p>Keppta Investment is provided "as is". Investment products carry risk - see our Risk Disclaimer for details. Past performance is not indicative of future results.</p>

      <h2>9. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Keppta Investment and its affiliates are not liable for indirect, incidental, or consequential damages arising from your use of the platform.</p>

      <h2>10. Changes to These Terms</h2>
      <p>We may update these Terms from time to time. Continued use after changes means you accept the updated Terms.</p>

      <h2>11. Contact</h2>
      <p>Questions about these Terms? Email us at <a href={`mailto:${SITE.support.email}`}>{SITE.support.email}</a>.</p>
    </LegalPage>
  ),
});
