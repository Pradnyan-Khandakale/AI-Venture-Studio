import { MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import { useMutation } from "react-query";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { boardroomApi } from "../services/api";
import { useStudioStore } from "../store/useStudioStore";

export default function BoardroomPage() {
  const project = useStudioStore((state) => state.selectedProject);
  const [question, setQuestion] = useState("Should I target B2B first?");
  // TODO: Run the executive debate with useMutation(boardroomApi.debate).
  const debate = useMutation(() => Promise.resolve(null));

  const submit = (event) => {
    event.preventDefault();
    // TODO: Send the selected project id and the question to the boardroom mutation.
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Startup boardroom</p>
        <h2 className="text-3xl font-bold">Executive debate mode</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">CEO, CTO, CFO, CMO, and VC agents discuss a founder question and produce a consensus report.</p>
      </section>
      <Card className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <input
            className="h-11 flex-1 rounded-md border border-border px-3 outline-none focus:ring-2 focus:ring-teal-600"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <Button disabled={debate.isLoading || !question.trim()}>
            <Send size={17} />
            {debate.isLoading ? "Debating..." : "Ask boardroom"}
          </Button>
        </form>
        {debate.isError && (
          <p className="mt-3 text-sm font-medium text-rose-600">
            {debate.error?.response?.data?.message || "Boardroom discussion failed. Please try again."}
          </p>
        )}
      </Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.75fr]">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <MessageSquareText size={19} />
            Discussion thread
          </h3>
          <div className="space-y-3">
            {(debate.data?.messages || []).map((message) => (
              <article key={`${message.role}-${message.content}`} className="rounded-lg border border-border bg-white p-4">
                <h4 className="mb-1 font-semibold text-teal-800">{message.role}</h4>
                <p className="text-sm leading-6 text-slate-700">{message.content}</p>
              </article>
            ))}
            {debate.isLoading && <p className="text-sm text-muted-foreground">The boardroom agents are preparing responses. This can take a minute with local Ollama models.</p>}
            {!debate.data && !debate.isLoading && <p className="text-sm text-muted-foreground">Ask a strategic question to begin.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-lg font-bold">Consensus report</h3>
          <pre className="mt-4 min-h-80 whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            {debate.data?.consensus || "No consensus generated yet."}
          </pre>
        </Card>
      </div>
    </div>
  );
}
