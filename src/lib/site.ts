// Central site metadata — used across SEO tags, JSON-LD, sitemap.
export const SITE = {
  name: "Kamdan",
  tagline: "Earn Daily • Invest Smart",
  description:
    "Kamdan is a Nigerian rewards & investment platform. Complete daily tasks, earn ₦100 every sign-in (₦500 on day 7), refer friends and grow your income.",
  keywords: [
    "Kamdan",
    "earn money Nigeria",
    "daily sign in bonus",
    "referral platform Nigeria",
    "investment platform",
    "make money online Nigeria",
    "task earning app",
    "naira rewards",
  ],
  // Stable published URL — valid once the project is published.
  url: "https://project--a45d359e-e925-4ef0-aa8a-9e395cd2d66c.lovable.app",
  ogImage:
    "https://project--a45d359e-e925-4ef0-aa8a-9e395cd2d66c.lovable.app/__l5e/assets-v1/45bf1d72-1a98-4b3a-9eea-3ce6e734dc57/og-image.jpg",
  twitter: "@kamdan",
  locale: "en_NG",
  country: "NG",
  // Placeholders — replace with real contact once provided.
  support: {
    email: "support@kamdan.example",
    whatsapp: "https://wa.me/000000000000",
    telegram: "https://t.me/kamdan_placeholder",
  },
  // Company deposit account (placeholder — replace with official details later)
  payment: {
    bank: "Opay",
    accountNumber: "9161366544",
    accountName: "Kamdan",
  },
  referralBonus: 500,
};

// WhatsApp number for admin payment confirmations (international format, no +).
export const NGN_WA_NUMBER = "2349161366544";

interface SeoArgs {
  title: string;
  description?: string;
  path: string; // e.g. "/task"
  image?: string;
  type?: "website" | "article";
  keywords?: string[];
  noindex?: boolean;
}

export function seo({
  title,
  description = SITE.description,
  path,
  image = SITE.ogImage,
  type = "website",
  keywords = SITE.keywords,
  noindex = false,
}: SeoArgs) {
  const url = `${SITE.url}${path}`;
  const meta = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords.join(", ") },
    { name: "author", content: SITE.name },
    ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : [{ name: "robots", content: "index, follow" }]),
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:site_name", content: SITE.name },
    { property: "og:locale", content: SITE.locale },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: SITE.twitter },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
  const links = [{ rel: "canonical", href: url }];
  return { meta, links };
}
