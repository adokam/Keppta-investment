import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthCard, Field, PrimaryButton, SecondaryButton } from "@/components/AuthCard";
import { supabase } from "@/integrations/supabase/client";

import { seo } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => {
    const s = seo({
      title: "Keppta Investment - Earn Daily, Invest Smart in Nigeria",
      description: "Sign in to Keppta Investment. Earn ₦100 every day (₦500 on day 7), complete tasks, refer friends and grow your income.",
      path: "/",
    });
    return {
      ...s,
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://project--a45d359e-e925-4ef0-aa8a-9e395cd2d66c.lovable.app/" },
          ],
        }),
      }],
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthCard title="Welcome back">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field name="email" icon={<Mail size={18} />} placeholder="Email address" type="email" />
        <Field
          name="password"
          icon={<Lock size={18} />}
          placeholder="Password"
          type={show ? "text" : "password"}
          trailing={
            <button type="button" onClick={() => setShow((s) => !s)} aria-label="Toggle password">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        <PrimaryButton>{loading ? "Signing in…" : "Login"}</PrimaryButton>
      </form>
      <Link to="/register" className="block">
        <SecondaryButton>Create an account</SecondaryButton>
      </Link>
    </AuthCard>
  );
}
