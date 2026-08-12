import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { User, Mail, Phone, Lock, LockKeyhole, Ticket, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthCard, Field, PrimaryButton, SecondaryButton } from "@/components/AuthCard";
import { supabase } from "@/integrations/supabase/client";

import { seo } from "@/lib/site";

export const Route = createFileRoute("/register")({
  head: () => seo({
    title: "Create your Keppta Investment account — Earn Daily & Invest Smart",
    description: "Join Keppta Investment in seconds. Earn ₦100 every daily sign-in (₦500 on day 7), invest in VIP products for daily profit, and get ₦500 for every friend you refer.",
    path: "/register",
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inviteFromUrl = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("code") ?? ""
    : "";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    const invite = String(form.get("invite") || "").trim();

    if (!username || !email || !password) {
      toast.error("Username, email and password are required.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { username, phone, invite_code: invite || null },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created!");
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthCard title="Create account">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field name="username" icon={<User size={18} />} placeholder="Username" />
        <Field name="email" icon={<Mail size={18} />} placeholder="Email address" type="email" />
        <Field name="phone" icon={<Phone size={18} />} placeholder="Phone Number" type="tel" />
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
        <Field
          name="confirm"
          icon={<LockKeyhole size={18} />}
          placeholder="Confirm password"
          type={show ? "text" : "password"}
        />
        <Field name="invite" icon={<Ticket size={18} />} placeholder="Invitation Code (optional)" defaultValue={inviteFromUrl} />
        <PrimaryButton>{loading ? "Creating…" : "Register"}</PrimaryButton>
      </form>
      <Link to="/" className="block">
        <SecondaryButton>Already have an account? Login</SecondaryButton>
      </Link>
    </AuthCard>
  );
}
