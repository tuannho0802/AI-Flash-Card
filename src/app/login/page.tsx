"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  Loader2,
  Mail,
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<
    string | null
  >(null);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailLogin = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        console.log(
          "Auth Error Details:",
          signInError,
        );
        setError(signInError.message);
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.log("Unexpected Error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-800/50 rounded-2xl shadow-xl p-8 border border-slate-700/50 backdrop-blur-sm"
      >
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Welcome Back
          </h1>
          <p className="text-slate-400 mt-2">
            Sign in to manage your flashcards
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-900/50">
            {error}
          </div>
        )}

        <form
          onSubmit={handleEmailLogin}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-white placeholder:text-slate-600"
                placeholder="name@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-white placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
