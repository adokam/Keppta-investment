import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { seo, SITE } from "@/lib/site";

export const Route = createFileRoute("/legal/privacy")({
  head: () => seo({
    title: "Privacy Policy - Keppta Investment",
    description: "How Keppta Investment collects, uses and protects your personal information.",
    path: "/legal/privacy",
  }),
  component: () => (
    <LegalPage title="Privacy Policy" updated="July 12, 2026">
      <p>{SITE.name} ("we", "us") respects your privacy. This policy explains what data we collect and how we use it.</p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account data:</strong> username, email, phone number.</li>
        <li><strong>Financial data:</strong> balance, deposits, withdrawals, transaction history.</li>
        <li><strong>Usage data:</strong> device, browser, IP address, pages visited.</li>
        <li><strong>Referral data:</strong> your referral code and network relationships.</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>To operate your account and process transactions.</li>
        <li>To calculate rewards, streaks and referral commissions.</li>
        <li>To prevent fraud and comply with legal obligations (KYC/AML).</li>
        <li>To communicate service updates and (with consent) marketing.</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>We do not sell your personal data. We may share it with payment processors, hosting providers, and regulators when required.</p>

      <h2>4. Security</h2>
      <p>We use encryption (HTTPS), Row-Level Security on our database, and secure authentication. No system is 100% secure - use a strong, unique password.</p>

      <h2>5. Cookies</h2>
      <p>We use essential cookies for authentication and analytics cookies to improve the service.</p>

      <h2>6. Your Rights (NDPR)</h2>
      <p>Under the Nigeria Data Protection Regulation, you may request access, correction, or deletion of your data by contacting <a href={`mailto:${SITE.support.email}`}>{SITE.support.email}</a>.</p>

      <h2>7. Data Retention</h2>
      <p>We retain account and transaction data for as long as your account is active and for up to 7 years after closure to comply with financial regulations.</p>

      <h2>8. Children</h2>
      <p>Keppta Investment is not intended for anyone under 18.</p>

      <h2>9. Changes</h2>
      <p>We may update this policy; the "Last updated" date reflects the latest revision.</p>

      <h2>10. Contact</h2>
      <p>Email <a href={`mailto:${SITE.support.email}`}>{SITE.support.email}</a> for privacy requests.</p>
    </LegalPage>
  ),
});
