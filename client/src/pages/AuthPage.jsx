import { Brain, Lock, Mail, UserPlus } from "lucide-react";
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

  // TODO: Call authApi.login or authApi.register for the active mode and store the
  // TODO: returned session with setAuth on success.
  const mutation = useMutation(
    (formData) => {
      if (mode === "login") {
        return authApi.login({ email: formData.email, password: formData.password });
      }
      return authApi.register(formData);
    },
    {
      onSuccess: (data) => {
        if (data?.token) {
          setAuth(data);
        }
      }
    }
  );

  const submit = (event) => {
    event.preventDefault();
    // TODO: Submit the form through the mutation above.
    mutation.mutate(form);
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-studio">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <section className="studio-grid flex min-h-[560px] flex-col justify-between bg-slate-950 p-8 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-500">
                <Brain size={22} />
              </div>
              <span className="text-lg font-bold">AI Venture Studio</span>
            </div>
            <div className="max-w-xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Local AI venture building</p>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Turn an early idea into an investor-ready blueprint.</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Multi-agent research, strategy, architecture, financials, GTM, scoring, boardroom debate, and exports built around free local-first AI services.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <span>Ollama-ready</span>
              <span>Human approvals</span>
              <span>PDF and email exports</span>
            </div>
          </section>
          <section className="p-6 sm:p-8">
            <Card className="border-0 p-0 shadow-none">
              <div className="mb-7">
                <h2 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Use the seeded demo credentials or create a local account.</p>
              </div>
              <form onSubmit={submit} className="space-y-4">
                {mode === "register" && (
                  <label className="block text-sm font-medium">
                    Name
                    <input
                      className="mt-1 h-11 w-full rounded-md border border-border px-3 outline-none focus:ring-2 focus:ring-teal-600"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                    />
                  </label>
                )}
                <label className="block text-sm font-medium">
                  Email
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                    <input
                      className="h-11 w-full rounded-md border border-border pl-10 pr-3 outline-none focus:ring-2 focus:ring-teal-600"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />
                  </div>
                </label>
                <label className="block text-sm font-medium">
                  Password
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                    <input
                      type="password"
                      className="h-11 w-full rounded-md border border-border pl-10 pr-3 outline-none focus:ring-2 focus:ring-teal-600"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                    />
                  </div>
                </label>
                {mutation.isError && <p className="text-sm text-rose-600">{mutation.error?.response?.data?.message || "Authentication failed"}</p>}
                <Button className="w-full" disabled={mutation.isLoading}>
                  <UserPlus size={17} />
                  {mutation.isLoading ? "Working..." : mode === "login" ? "Sign in" : "Register"}
                </Button>
              </form>
              <button className="mt-5 text-sm font-medium text-teal-700" onClick={() => setMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "Create a new account" : "Use an existing account"}
              </button>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
