"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const { signUp, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already authenticated, redirect to workspace dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Initial Validations
    if (!email || !password || !confirmPassword) {
      setErrorMsg("Please complete all security credentials.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Security Code must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Security codes do not match. Please verify.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, user: signUpUser } = await signUp({ email, password });
      
      if (error) {
        setErrorMsg(error.message || "Registration rejected by security server.");
      } else {
        // If supabase returns a user but session is null (due to email verification requirements)
        if (signUpUser && !signUpUser.identities?.length) {
          setSuccessMsg("Key registered! A verification link has been transmitted. Please check your inbox.");
        } else {
          setSuccessMsg("Access key registered! Establishing secure tunnel...");
          setTimeout(() => {
            router.push("/");
          }, 1500);
        }
      }
    } catch (err) {
      setErrorMsg("An unexpected connection issue occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-[20%] right-[15%] w-72 h-72 rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none animate-float"></div>
      <div className="absolute bottom-[20%] left-[15%] w-72 h-72 rounded-full bg-pink-600/10 blur-[80px] pointer-events-none animate-float" style={{ animationDelay: "3s" }}></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 relative overflow-hidden animate-slide-in">
        {/* Glow accent top boundary line */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>

        {/* Header Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Register Access Key
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Configure new keys to join the private chat workspace
          </p>
        </div>

        {/* Notifications and Alerts */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-2.5 animate-slide-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start space-x-2.5 animate-slide-in">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Element */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
              Workspace Mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@omnichat.io"
                className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
              Security Code
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-11 pr-11 py-3 rounded-xl glass-input text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
              Verify Security Code
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full pl-11 pr-11 py-3 rounded-xl glass-input text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3.5 rounded-xl glass-button font-semibold tracking-wide flex items-center justify-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Node...</span>
              </>
            ) : (
              <>
                <span>Provision Keys</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Nav Links */}
        <div className="mt-8 text-center border-t border-white/5 pt-6 text-xs text-slate-400">
          Already provisioned?{" "}
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline underline-offset-4"
          >
            Sign In Gateway
          </Link>
        </div>
      </div>
    </main>
  );
}
