'use client';

/*app/proposal/page.tsx*/
import { useState } from 'react';
import type { ProposalAnalysis } from '@/types/task';
import { ErrorBanner, EmptyState } from '@/components/StatusMessage';

const REC_STYLE: Record<string, string> = {
  approve: 'bg-status-done/15 text-status-done',
  revise:  'bg-warning/15 text-warning',
  reject:  'bg-danger/15 text-danger',
};

export default function ProposalPage() {
  const [proposalText, setProposalText] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProposalAnalysis | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAnalysis(null);
    setAddedCount(null);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/proposal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalText, projectContext }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setAnalysis(json);
      setSelected(new Set(json.proposedTasks.map((_: unknown, i: number) => i))); // default: all selected
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleAddTasks = async () => {
    if (!analysis) return;
    setAdding(true);
    try {
      const tasks = analysis.proposedTasks.filter((_, i) => selected.has(i));
      const res = await fetch('/api/proposal-to-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setAddedCount(json.created.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 ">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2.5 text-3xl md:text-3xl font-display font-semibold tracking-tight text-foreground print:text-xl">
            <span className="w-1.5 h-7 md:h-8 rounded-full bg-proposal print:hidden" aria-hidden="true" />
            Proposal Analyser
        </h1>
        </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start print:grid-cols-1">
        <form onSubmit={handleAnalyze} className="space-y-3 print:hidden">
            <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Project context (optional) — goals, constraints, team, tech stack
                </label>
                <textarea
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    rows={3}
                    placeholder="e.g. Small team of 4, currently focused on shipping v1 by end of quarter, limited budget for new tooling…"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 themed-scrollbar"
                />
            </div>
            <textarea
            value={proposalText}
            onChange={(e) => setProposalText(e.target.value)}
            rows={12}
            placeholder="Paste the proposal document here…"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 themed-scrollbar"
            />
            {error && <ErrorBanner message={error} />}
            <button
            type="submit"
            disabled={analyzing || !proposalText.trim()}
            className="rounded-md bg-proposal px-4 py-2 text-sm text-foreground hover:bg-proposal/65 text-white disabled:opacity-100 transition-colors">
            {analyzing ? 'Analysing…' : 'Analyse Proposal'}
            </button>
        </form>

        <div className="space-y-5">
            {!analysis && (
                <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
                <p className="text-sm font-medium text-foreground mb-1">Your analysis will appear here</p>
                <p className="text-sm text-muted-foreground">Paste a proposal on the left and run it to see the summary, recommendation, and suggested follow-up tasks.</p>
                </div>
            )}
            {analysis && (
                <div className="mt-2 space-y-6">
                    <div className="rounded-xl border border-border bg-surface p-5 print:rounded-none">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${REC_STYLE[analysis.recommendation]}`}>
                                {analysis.recommendation}
                            </span>
                        </div>
                    <p className="text-base text-foreground leading-relaxed">{analysis.summary}</p>
                    <p className="text-sm text-muted-foreground mt-2 italic leading-relaxed">{analysis.recommendationReasoning}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
                    <div className="rounded-lg rounded-l-none border border-border border-l-4 border-l-status-done bg-surface p-4">
                        <h3 className="text-sm font-display font-semibold text-foreground mb-2">Strengths</h3>
                        <ul className="text-sm text-foreground list-disc list-inside space-y-1 leading-relaxed">
                            {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div className="rounded-lg rounded-l-none border border-border border-l-4 border-l-danger bg-surface p-4">
                        <h3 className="text-sm font-display font-semibold text-foreground mb-2">Risks</h3>
                        <ul className="text-sm text-foreground list-disc list-inside space-y-1 leading-relaxed">
                            {analysis.risks.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                </div>

                {analysis.proposedTasks.length > 0 ? (
                    <div>
                    <h3 className="text-base font-display font-semibold text-foreground mb-3">
                        Proposed follow-up tasks — select which to add
                    </h3>
                    <ul className="space-y-2 mb-4">
                        {analysis.proposedTasks.map((t, i) => (
                            <li key={i} className="flex items-start gap-3 rounded-md rounded-l-none border border-border border-l-4 border-l-proposal px-4 py-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={selected.has(i)}
                                    onChange={() => toggle(i)}
                                    className="mt-1.5 print:hidden"
                                />
                                <div className="min-w-0">
                                    <div className="font-medium text-base text-foreground break-words">{t.title}</div>
                                    {t.description && <div className="text-sm text-muted-foreground break-words mt-0.5">{t.description}</div>}
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {t.assignedTo?.join(', ') || 'Unassigned'}
                                        {t.deadline && ` · due ${t.deadline}${t.deadlineTime ? ' ' + t.deadlineTime : ''}`}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center justify-between print:hidden">
                        <button
                            onClick={handleAddTasks}
                            disabled={adding || selected.size === 0}
                            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50 transition-colors print:hidden"
                        >
                            {adding ? 'Adding…' : `Add ${selected.size} task${selected.size === 1 ? '' : 's'} to backlog`}
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background transition-colors"
                        >
                            Print / Save as PDF
                        </button>
                    </div>
                    {addedCount !== null && (
                        <p className="text-xs text-status-done mt-2">Added {addedCount} task{addedCount === 1 ? '' : 's'}.</p>
                    )}
                    </div>
                ) : (
                    <>
                        <EmptyState message="No follow-up tasks suggested for this proposal." />
                        <div className="flex justify-end mt-3 print:hidden">
                            <button onClick={() => window.print()} className="rounded-md border border-border bg-surface hover:bg-background text-foreground px-3 py-1.5 text-sm font-medium transition-colors">
                                Print / Save as PDF
                            </button>
                        </div>
                    </>
                )}
                </div>
            )}
      </div>
    </div>
    </div>
  );
}