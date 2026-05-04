"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconArrowRight as ArrowRightIcon, IconTool as WrenchIcon, IconFileCheck as DocumentCheckIcon, IconUsers as UsersIcon } from "@tabler/icons-react";
import { signIn } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "admin_only") {
      toast.error("Access denied. This portal is for administrators only.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await signIn(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        router.refresh();
        router.push("/dashboard/overview");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setEmailError(true);
      toast.error("Please enter your email address to reset your password.");
      return;
    }

    setIsLoading(true);
    try {
      // MUST use browser client so Supabase stores the PKCE code_verifier
      // in the browser session before sending the email. Server Actions
      // cannot store the verifier, causing exchangeCodeForSession to fail.
      // Set a cookie so the callback knows where to redirect — Supabase strips
      // custom query params from redirectTo during the PKCE redirect chain.
      document.cookie = "auth_redirect=/reset-password; path=/; max-age=600; SameSite=Lax";
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Please check your inbox.");
      }
    } catch {
      toast.error("Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-dvh w-full flex overflow-hidden">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="relative w-full max-w-md space-y-8">
          <div className="absolute left-0 right-0 bottom-full mb-10 flex flex-col items-center cursor-default">
            <span className="font-paladins text-6xl tracking-[0.08em] text-foreground leading-none">
              THOR<span className="font-sans text-[0.55em] font-semibold ml-[0.2em] align-super">™</span>
            </span>
            <span className="mt-2 text-sm text-muted-foreground tracking-wide">
              Tradie OS: Construction Amplified
            </span>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <div className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email</label>
                <Input
                  id="email"
                  name="email"
                  placeholder="m@example.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value) setEmailError(false);
                  }}
                  className={emailError ? "border-red-500 ring-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">Password</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-foreground hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input id="password" name="password" type="password" required />
              </div>

              <Button className="w-full h-11 text-base group" type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : "Sign In"}
                {!isLoading && <ArrowRightIcon className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </Button>
            </form>
          </div>

        </div>
      </div>

      {/* Right Panel - THOR */}
      <div className="hidden lg:flex flex-1 bg-black relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(240,90,40,0.08),transparent_50%)]" />

        <div className="relative z-10 max-w-lg space-y-8">
          <div className="space-y-4">
            <Badge className="px-3 py-1 font-medium bg-white/10 text-white border-0 hover:bg-white/20">
              Admin
            </Badge>
            <h3 className="text-4xl font-bold leading-tight text-white">
              Manage jobs, projects<br />and contacts.
            </h3>
            <p className="text-lg text-white/60">
              The THOR™ admin dashboard lets you oversee your CRM, projects and users so your business runs smoothly.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              { icon: WrenchIcon, label: "Jobs & scheduling" },
              { icon: DocumentCheckIcon, label: "Projects & jobs" },
              { icon: UsersIcon, label: "Companies & contacts" },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-white/80">{label}</span>
              </div>
            ))}
          </div>

          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#F05A28]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-dvh flex items-center justify-center text-muted-foreground animate-pulse">Loading authentication...</div>}>
      <AuthContent />
    </Suspense>
  );
}

