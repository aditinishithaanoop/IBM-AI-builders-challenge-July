'use client';

import { useState } from 'react';
import type { ProposalAnalysis } from '@/types/task';
import { ErrorBanner, EmptyState } from '@/components/StatusMessage';

const REC_STYLE: Record<string, string> = {
  approve: 'bg-lime-200 text-green-800 dark:bg-green-900 dark:text-green-200',
  revise:  'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200',
  reject:  'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
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
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Proposal Analyser</h1>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-3 print:hidden">
        <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Project context (optional) — goals, constraints, team, tech stack
            </label>
            <textarea
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                rows={3}
                placeholder="e.g. Small team of 4, currently focused on shipping v1 by end of quarter, limited budget for new tooling…"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
        </div>
        <textarea
          value={proposalText}
          onChange={(e) => setProposalText(e.target.value)}
          rows={12}
          placeholder="Paste the proposal document here…"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
        {error && <ErrorBanner message={error} />}
        <button
          type="submit"
          disabled={analyzing || !proposalText.trim()}
          className="rounded-md bg-zinc-200 dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-500 dark:hover:bg-zinc-700 hover:text-zinc-50 disabled:opacity-100 transition-colors">
          {analyzing ? 'Analysing…' : 'Analyse Proposal'}
        </button>
      </form>

      {analysis && (
        <div className="mt-8 space-y-5">
          <div className="flex justify-end print:hidden">
                <button
                    onClick={() => window.print()}
                    className="rounded-md bg-zinc-200 dark:bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-400 dark:hover:bg-zinc-700 transition-colors"
                >
                    Print / Save as PDF
                </button>
            </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${REC_STYLE[analysis.recommendation]}`}>
                {analysis.recommendation}
              </span>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{analysis.summary}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 italic">{analysis.recommendationReasoning}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mb-1">Strengths</h3>
              <ul className="text-xs text-zinc-700 dark:text-zinc-300 list-disc list-inside space-y-0.5">
                {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mb-1">Risks</h3>
              <ul className="text-xs text-zinc-700 dark:text-zinc-300 list-disc list-inside space-y-0.5">
                {analysis.risks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>

          {analysis.proposedTasks.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Proposed follow-up tasks — select which to add
              </h3>
              <ul className="space-y-2 mb-3">
                {analysis.proposedTasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      className="mt-1 print:hidden"
                    />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{t.title}</div>
                      {t.description && <div className=" text-zinc-600 dark:text-zinc-400">{t.description}</div>}
                      <div className="text-xs text-zinc-700 dark:text-zinc-300">
                        {t.assignedTo?.join(', ') || 'Unassigned'}
                        {t.deadline && ` · due ${t.deadline}${t.deadlineTime ? ' ' + t.deadlineTime : ''}`}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleAddTasks}
                disabled={adding || selected.size === 0}
                className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors print:hidden"
              >
                {adding ? 'Adding…' : `Add ${selected.size} task${selected.size === 1 ? '' : 's'} to backlog`}
              </button>
              {addedCount !== null && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-2">Added {addedCount} task{addedCount === 1 ? '' : 's'}.</p>
              )}
            </div>
          ) : (
            <EmptyState message="No follow-up tasks suggested for this proposal." />
          )}
        </div>
      )}
    </div>
  );
}