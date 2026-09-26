import React, { useState } from "react";
import {
  Search,
  BookOpen,
  Sparkles,
  ExternalLink,
  Filter,
  Database,
  X
} from "lucide-react";
import { useQuery } from "react-query";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { memoryApi, projectApi } from "../services/api.js";
import { useStudioStore } from "../store/useStudioStore.js";

const QUICK_SUGGESTIONS = [
  "AI healthcare",
  "Fintech expense management",
  "SMB founders",
  "SaaS acquisition & CAC",
  "Technical architecture",
  "Revenue models"
];

const DELIVERABLE_TYPES = [
  { key: "", label: "All Deliverables" },
  { key: "project_brief", label: "Venture Briefs" },
  { key: "market", label: "Market Research" },
  { key: "competitor", label: "Competitor Analysis" },
  { key: "opportunity", label: "Opportunity Discovery" },
  { key: "product", label: "Product Strategy" },
  { key: "prd", label: "PRD" },
  { key: "architecture", label: "System Architecture" },
  { key: "revenue", label: "Revenue Models" },
  { key: "financial", label: "Financial Forecasts" },
  { key: "gtm", label: "Go-to-Market" },
  { key: "investor", label: "Investor Readiness" },
  { key: "pitch", label: "Pitch Deck" }
];

export default function MemoryPage({ onOpenStudio }) {
  const { setSelectedProject } = useStudioStore();
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState("");
  const [previewItem, setPreviewItem] = useState(null);

  // Fetch list of user's projects for project filter dropdown
  const { data: projects = [] } = useQuery("projects", projectApi.list);

  // Execute memory search with react-query
  const {
    data: searchData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(
    ["memory-search", activeQuery, selectedProjectFilter, selectedAgentFilter],
    () =>
      activeQuery
        ? memoryApi.search(activeQuery, {
            projectId: selectedProjectFilter || undefined,
            agentKey: selectedAgentFilter || undefined,
            limit: 25
          })
        : Promise.resolve({ ok: true, count: 0, results: [] }),
    {
      enabled: Boolean(activeQuery.trim()),
      staleTime: 60000
    }
  );

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchInput.trim()) {
      setActiveQuery(searchInput.trim());
    }
  };

  const handleQuickChipClick = (suggestion) => {
    setSearchInput(suggestion);
    setActiveQuery(suggestion);
  };

  const handleClear = () => {
    setSearchInput("");
    setActiveQuery("");
  };

  const handleOpenVenture = (projectId) => {
    const proj = projects.find((p) => String(p._id || p.id) === String(projectId));
    if (proj) {
      setSelectedProject(proj);
      if (onOpenStudio) onOpenStudio(proj);
    }
  };

  const results = searchData?.results || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Page Title & Intro */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
              <Database size={14} /> Historical Studio Memory & RAG
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Venture Knowledge Search</h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Semantic and contextual search across previous venture briefs, market research, competitor analyses, and generated blueprint deliverables.
          </p>
        </div>
      </section>

      {/* Search Input Bar */}
      <Card className="p-4 sm:p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="memory-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search historical startup knowledge, target users, market findings, CAC..."
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button
            id="memory-search-submit-btn"
            type="submit"
            variant="primary"
            className="text-xs bg-teal-700 hover:bg-teal-800 flex-shrink-0"
            disabled={!searchInput.trim() || isLoading}
          >
            <Search size={14} />
            {isLoading ? "Searching..." : "Search Memory"}
          </Button>
        </form>

        {/* Quick query chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" /> Try:
          </span>
          {QUICK_SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleQuickChipClick(q)}
              className="bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 px-2.5 py-1 rounded-full transition-colors border border-slate-200"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <span className="font-semibold text-slate-700">Filter Venture:</span>
            <select
              id="memory-venture-filter"
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="">All Ventures ({projects.length})</option>
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.startupName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Tag size={14} className="text-slate-500" />
            <span className="font-semibold text-slate-700">Deliverable:</span>
            <select
              id="memory-agent-filter"
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              {DELIVERABLE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Results Header */}
      {activeQuery && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Found <strong className="text-slate-800">{results.length}</strong> matching deliverables for &ldquo;{activeQuery}&rdquo;
          </span>
          <span className="flex items-center gap-1.5 text-teal-700 font-medium">
            <Sparkles size={13} />
            Relevance-Ranked Retrieval
          </span>
        </div>
      )}

      {/* Results List */}
      <div id="memory-results-container" className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <Card className="p-8 text-center text-sm text-rose-600">
            Memory search encountered an issue: {error?.response?.data?.message || error?.message || "Server error"}
          </Card>
        )}

        {!isLoading && !isError && activeQuery && results.length === 0 && (
          <Card className="p-12 text-center space-y-3">
            <BookOpen size={28} className="text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No relevant historical knowledge found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No previous reports or venture briefs in your workspace matched &ldquo;{activeQuery}&rdquo;. Try using broader search keywords or generating additional reports in the Studio.
            </p>
          </Card>
        )}

        {!isLoading && !activeQuery && (
          <Card className="p-12 text-center space-y-3 bg-slate-50/50 border-dashed">
            <Search size={32} className="text-teal-600/70 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Ready to search venture memory</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Enter a query or click one of the suggested topics above to retrieve relevant insights from all your previous venture blueprints.
            </p>
          </Card>
        )}

        {!isLoading &&
          results.map((item) => (
            <Card
              key={item.id}
              className="p-5 hover:border-teal-200 transition-all shadow-sm space-y-3 bg-white"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Building2 size={15} className="text-teal-700" />
                    {item.startupName}
                  </span>
                  {item.industry && (
                    <span className="text-xs text-slate-500">
                      • {item.industry}
                    </span>
                  )}
                  <Badge tone="running" className="text-[11px] bg-teal-50 text-teal-800 border-teal-200">
                    <FileText size={11} className="mr-1" />
                    {item.title}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {item.score !== undefined && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                      {Math.round(item.score * 100)}% Match
                    </span>
                  )}
                  <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                    <Calendar size={12} />
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>

              {/* Excerpt Snippet */}
              <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono leading-relaxed">
                {item.relevantText}
              </div>

              {/* Card Footer / Action */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-mono">
                  File: {item.outputFile}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewItem(item)}
                    className="text-xs text-teal-700 hover:text-teal-800"
                  >
                    View Snippet
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenVenture(item.projectId)}
                    className="text-xs flex items-center gap-1"
                  >
                    Open Studio
                    <ArrowRight size={12} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
      </div>

      {/* Snippet Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  {previewItem.startupName}
                </span>
                <h3 className="text-base font-bold text-slate-900">{previewItem.title}</h3>
                <p className="text-xs text-slate-400 font-mono">{previewItem.outputFile}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {previewItem.relevantText}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-700 font-semibold">
                Relevance: {Math.round((previewItem.score || 0) * 100)}%
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPreviewItem(null)} className="text-xs">
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleOpenVenture(previewItem.projectId);
                    setPreviewItem(null);
                  }}
                  className="text-xs bg-teal-700 hover:bg-teal-800"
                >
                  <ExternalLink size={13} /> Open Studio
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
