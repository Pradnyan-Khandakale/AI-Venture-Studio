import { Brain, Lock, Mail, UserPlus, LogIn, KeyRound } from "lucide-react";
import { useState } from "react";
import { useMutation } from "react-query";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { authApi } from "../services/api";
import { useStudioStore } from "../store/useStudioStore";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "founder@example.com", password: "password123" });
  const setAuth = useStudioStore((state) => state.setAuth);

  const mutation = useMutation(
    (formData) => {
      if (mode === "login") {
        return authApi.login({ email: formData.email, password: formData.password });
      }
      return authApi.register(formData);
    },
    {
      onSuccess: (data) => {
        if (data?.token && data?.user) {
          setAuth(data);
        }
      }
    }
  );

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  const switchMode = (newMode) => {
    mutation.reset();
    setMode(newMode);
    if (newMode === "login") {
      setForm({ name: "", email: "founder@example.com", password: "password123" });
    } else {
      setForm({ name: "Jane Founder", email: "jane@example.com", password: "password123" });
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <section className="studio-grid flex min-h-[560px] flex-col justify-between bg-slate-950 p-8 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-500 text-white shadow-sm">
                <Brain size={22} />
              </div>
              <span className="text-lg font-bold tracking-tight">AI Venture Studio</span>
            </div>
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
                Phase 2: Authentication
              </p>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                Turn an early idea into an investor-ready blueprint.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
                Secure local-first authentication backed by JWT, bcrypt password hashing, and seamless in-memory fallback.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/80 p-3.5 border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">Seeded Demo Account:</span>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1"
                >
                  <KeyRound size={12} />
                  Fill Demo
                </button>
              </div>
              <p className="font-mono text-[11px] text-slate-400">

                Email: <span className="text-slate-200">founder@example.com</span> | Password:{" "}
                <span className="text-slate-200">password123</span>
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-8 flex flex-col justify-center">
            <Card className="border-0 p-0 shadow-none">
              <div className="mb-6">
                <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                      mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                      mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Register
                  </button>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {mode === "login" ? "Welcome back" : "Create an account"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {mode === "login"
                    ? "Enter your credentials or use the seeded demo account."
                    : "Register a new local founder account."}
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === "register" && (
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name
                    <input
                      id="name-input"
                      type="text"
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      placeholder="Jane Founder"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      required
                    />
                  </label>
                )}
                <label className="block text-xs font-semibold text-slate-700">
                  Email Address
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={17} />
                    <input
                      id="email-input"
                      type="email"
                      className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      placeholder="founder@example.com"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      required
                    />
                  </div>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={17} />
                    <input
                      id="password-input"
                      type="password"
                      className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      required
                    />
                  </div>
                </label>

                {mutation.isError && (
                  <div className="rounded-md bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
                    {mutation.error?.response?.data?.message || mutation.error?.message || "Authentication failed"}
                  </div>
                )}

                <Button
                  id="submit-auth-btn"
                  className="w-full h-10 mt-2"
                  disabled={mutation.isLoading}
                >
                  {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                  <span>
                    {mutation.isLoading ? "Authenticating..." : mode === "login" ? "Sign In" : "Create Account"}
                  </span>
                </Button>
              </form>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
