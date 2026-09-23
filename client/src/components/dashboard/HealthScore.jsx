import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Card } from "../ui/Card";

export function HealthScore({ score }) {
  const data = [
    { metric: "Demand", value: score?.marketDemand || 0 },
    { metric: "Competition", value: score?.competition || 0 },
    { metric: "Revenue", value: score?.revenuePotential || 0 },
    { metric: "Feasibility", value: score?.technicalFeasibility || 0 },
    { metric: "Execution", value: score?.executionComplexity || 0 }
  ];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">Startup health</h3>
          <p className="text-sm text-muted-foreground">Readiness radar</p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold text-teal-700">{score?.overall || 0}</span>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <Radar dataKey="value" stroke="#0f766e" fill="#14b8a6" fillOpacity={0.42} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
