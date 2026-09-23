import { Activity, Clock, Coins, ListChecks } from "lucide-react";
import { useQuery } from "react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/ui/Card";
import { analyticsApi } from "../services/api";

export default function AnalyticsPage() {
  // TODO: Load the analytics overview with useQuery("analytics", analyticsApi.overview).
  const data = null;
  const cards = [
    { label: "Agent runtime", value: `${data?.averageRuntime || 0}s`, icon: Clock },
    { label: "Completion rate", value: `${data?.completionRate || 0}%`, icon: ListChecks },
    { label: "Token usage", value: data?.tokenUsage || 0, icon: Coins },
    { label: "Most used", value: data?.mostUsedAgent || "Market", icon: Activity }
  ];

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Operations</p>
        <h2 className="text-3xl font-bold">Agent analytics</h2>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <Icon className="mb-4 text-teal-700" size={22} />
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-bold">{card.value}</p>
            </Card>
          );
        })}
      </div>
      <Card className="p-5">
        <h3 className="mb-4 text-lg font-bold">Agent usage</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.agentUsage || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="runs" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
