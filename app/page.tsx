"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Wrench, FileCheck, Users } from "lucide-react";
import { signIn, demoSignIn } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
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
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const result = await demoSignIn();
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.error("Demo login failed");
    } finally {
      setIsDemoLoading(false);
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
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Please check your inbox.");
      }
    } catch (err: any) {
      toast.error("Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-8 cursor-default">
              <Logo size="large" />
            </div>
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
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </Button>
            </form>
          </div>

          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full h-11 text-base"
            onClick={handleDemoLogin}
            disabled={isDemoLoading || isLoading}
          >
            {isDemoLoading ? "Signing in..." : "Try Demo"}
          </Button>

          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              Access to this platform is currently by invite only.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - MXD */}
      <div className="hidden lg:flex flex-1 bg-black relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(240,90,40,0.08),transparent_50%)]" />

        <div className="relative z-10 max-w-lg space-y-8">
          <div className="space-y-4">
            <Badge className="px-3 py-1 font-medium bg-white/10 text-white border-0 hover:bg-white/20">
              Admin
            </Badge>
            <h3 className="text-4xl font-bold leading-tight text-white">
              Manage leads, projects<br />and contacts.
            </h3>
            <p className="text-lg text-white/60">
              The MXD admin dashboard lets you oversee your CRM, projects and users so your business runs smoothly.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              { icon: Wrench, label: "Leads & opportunities" },
              { icon: FileCheck, label: "Projects & jobs" },
              { icon: Users, label: "Companies & contacts" },
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">Loading authentication...</div>}>
      <AuthContent />
    </Suspense>
  );
}

