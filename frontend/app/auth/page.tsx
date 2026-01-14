"use client";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, go to Dashboard
  useEffect(() => {
    if (localStorage.getItem("token")) {
      router.push("/");
    }
  }, [router]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint =
      authView === "login"
        ? "http://localhost:8080/api/auth/login"
        : "http://localhost:8080/api/auth/register";

    const payload =
      authView === "login"
        ? { username, password }
        : { username, password, full_name: fullName };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Auth failed");

      if (authView === "login") {
        // Success: Save Token & Redirect
        localStorage.setItem("token", result.token);
        localStorage.setItem("username", result.username);
        router.push("/"); // Go to Dashboard
      } else {
        alert("Registration successful! Please login.");
        setAuthView("login");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleView = () => {
    setAuthView(authView === "login" ? "register" : "login");
    setError("");
    setUsername("");
    setPassword("");
    setFullName("");
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Visual Side (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-indigo-950 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-900/30 backdrop-blur-3xl"></div>

        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <Sparkles className="w-8 h-8 text-indigo-300" />
            </div>
            <span className="text-xl font-bold tracking-wide">Super App</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Explore the future of{" "}
            <span className="text-indigo-400">digital experiences</span>.
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Join our community to access exclusive features, manage your
            bookings, and experience seamless connectivity like never before.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 bg-slate-50 relative">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {authView === "login" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {authView === "login"
                ? "Enter your credentials to access your account"
                : "Fill in your details to get started"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="mt-8 space-y-6">
            <div className="space-y-4">
              {authView === "register" && (
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    required
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white text-slate-900 pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white text-slate-900 pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white text-slate-900 pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {authView === "login" ? "Sign In" : "Sign Up"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-50 px-2 text-slate-400 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              disabled
              className="flex items-center justify-center py-2.5 border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-semibold text-slate-600">Google</span>
            </button>
            <button
              disabled
              className="flex items-center justify-center py-2.5 border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-semibold text-slate-600">GitHub</span>
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            {authView === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={toggleView}
              className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              {authView === "login" ? "Register now" : "Log in"}
            </button>
          </p>
        </div>

        <div className="absolute bottom-6 text-xs text-slate-400">
          &copy; 2026 Super App Inc. All rights reserved.
        </div>
      </div>
    </div>
  );
}
