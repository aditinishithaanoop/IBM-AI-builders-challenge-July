'use client';

import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, TaskScore, TaskStatus, TaskSource } from '@/types/task';
import { ErrorBanner, EmptyState } from '@/components/StatusMessage';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done', 'blocked'];
const SCORES: TaskScore[] = [1, 2, 3, 4, 5];

const STATUS_BADGE: Record<TaskStatus, string> = {
  'todo':        'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
  'in-progress': 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200',
  'done':        'bg-lime-200 text-green-800 dark:bg-green-900 dark:text-green-200',
  'blocked':     'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'
};

const SOURCE_BADGE: Record<TaskSource, string> = {
  manual:   '',
  meeting:  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
  proposal: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200',
};

const SOURCE_LABEL: Record<TaskSource, string> = {
  manual:   '',
  meeting:  'Meeting',
  proposal: 'Proposal',
};

const COLS = ['Rank', 'Title', 'Status', 'Assigned To', 'Deadline', 'Effort', 'Impact'] as const;

const dots = (n?: number) =>
  n ? '●'.repeat(n) + '○'.repeat(5 - n) : '—';

// ─── empty form state ────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string; 
  deadline: string;
  includeTime: boolean;
  deadlineTime: string;
  effort: TaskScore | '';
  impact: TaskScore | '';
}

const EMPTY: FormState = {
  title: '',
  description: '',
  status: 'todo',
  assignedTo: '',
  deadline: '',
  includeTime: false,
  deadlineTime: '',
  effort: '',
  impact: '',
};

// ─── component ───────────────────────────────────────────────────────────────

export default function TaskTable() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [form, setForm]         = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null); 
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prioritizing, setPrioritizing] = useState(false);
  const [prioritizeError, setPrioritizeError] = useState<string | null>(null);
  const firstField              = useRef<HTMLInputElement>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to load tasks');
      setTasks(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // focus first field when modal opens
  useEffect(() => {
    if (open) setTimeout(() => firstField.current?.focus(), 50);
  }, [open]);

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = editingId ? `/api/tasks/${editingId}` : '/api/tasks';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:    form.title.trim(),
          status:   form.status,
          ...(form.description && { description: form.description.trim() }),
          ...(form.assignedTo && { 
            assignedTo: form.assignedTo.split(',').map((s) => s.trim()).filter(Boolean)}),
          ...(form.deadline && { deadline: form.deadline }),
          ...(form.deadline && form.includeTime && form.deadlineTime && { deadlineTime: form.deadlineTime }),
          ...(form.effort   && { effort:   Number(form.effort) }),
          ...(form.impact   && { impact:   Number(form.impact) }),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? 'Request failed');
      }
      setOpen(false);
      setForm(EMPTY);
      setEditingId(null);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── handle Edit ────────────────────────────────────────────────────────────
  const handleEditClick = (t: Task) => {
    setForm({
      title: t.title,
      description: t.description ?? '',
      status: t.status,
      assignedTo: t.assignedTo?.join(', ') ?? '',
      deadline: t.deadline ?? '',
      includeTime: !!t.deadlineTime,
      deadlineTime: t.deadlineTime ?? '',
      effort: t.effort ?? '',
      impact: t.impact ?? '',
    });
    setEditingId(t.id);
    setOpen(true);
  };

  // ── handle Delete ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchTasks();
  };

  // ── handle Prioritize ──────────────────────────────────────────────────────
  const handlePrioritize = async () => {
    setPrioritizing(true);
    setPrioritizeError(null);
    try {
      const res = await fetch('/api/prioritize', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? 'Failed to rank backlog');
      }
      await fetchTasks();
    } catch (err) {
      setPrioritizeError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPrioritizing(false);
    }
  };

  // ── field helper ───────────────────────────────────────────────────────────
  const field = (key: keyof FormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  // ── Sort by rank ───────────────────────────────────────────────────────────
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.rank == null && b.rank == null) return 0;
    if (a.rank == null) return 1;   // unranked tasks sink to the bottom
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Tasks</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrioritize}
            disabled={prioritizing || tasks.length === 0}
            className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {prioritizing ? 'Ranking…' : 'Rank Backlog'}
          </button>
          <button
            onClick={() => { setOpen(true); setError(null); }}
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            + Add Task
          </button>
        </div>
      </div>
      {prioritizeError && <div className="mb-4"><ErrorBanner message={prioritizeError} /></div>}

      {/* table */}
      <div className="overflow-x-auto scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-sm text-left table-fixed">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            <tr>
              {COLS.map((col) => (
                <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
            {loading ? (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="p-0">
                  <EmptyState message="No tasks yet - add one above." />
                </td>
              </tr>
            ) : (
              sortedTasks.map((t) => (
                <React.Fragment key={t.id}>
                  <tr
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 font-medium">{t.rank ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 max-w-xs">
                       <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{t.title}</span>
                        {t.source !== 'manual' && (
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_BADGE[t.source]}`}>
                            {SOURCE_LABEL[t.source]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status]}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.assignedTo?.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {t.deadline ? `${t.deadline}${t.deadlineTime ? ' ' + t.deadlineTime : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 dark:text-zinc-600 tracking-tighter">{dots(t.effort)}</td>
                    <td className="px-4 py-3 text-zinc-400 dark:text-zinc-600 tracking-tighter">{dots(t.impact)}</td>
                  </tr>
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={COLS.length} className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900">
                        <div className="flex flex-col gap-2">
                          {t.description && (
                            <div className="max-w-2xl text-xs text-zinc-600 dark:text-zinc-400 whitespace-normal break-words">
                              {t.description}
                            </div>
                          )}
                          {t.reasoning && (
                            <div className="max-w-2xl text-xs text-zinc-500 dark:text-zinc-500 italic whitespace-normal break-words">
                              Reasoning: {t.reasoning}
                            </div>
                          )}
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditClick(t); }}
                              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                              className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                   </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 shadow-xl p-6">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {editingId ? 'Edit Task' : 'New Task'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* title */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Title <span className="text-red-400">*</span></label>
                <input
                  ref={firstField}
                  required
                  {...field('title')}
                  placeholder="e.g. Migrate authentication"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              {/* status */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Status <span className="text-red-400">*</span></label>
                <select
                  {...field('status')}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Assigned To</label>
                <input
                  {...field('assignedTo')}
                  placeholder="e.g. Alice, Bob"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Deadline</label>
                  <input type="date" 
                    {...field('deadline')} 
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    <input
                      type="checkbox"
                      checked={form.includeTime}
                      onChange={(e) => setForm((f) => ({ ...f, includeTime: e.target.checked }))}
                    />
                    Include time
                  </label>
                  {form.includeTime && (
                    <input type="time" 
                      {...field('deadlineTime')} 
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" />
                  )}
                </div>
              </div>

              {/* effort + impact side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Effort (1–5)</label>
                  <select
                    {...field('effort')}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                  >
                    <option value="">—</option>
                    {SCORES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Impact (1–5)</label>
                  <select
                    {...field('impact')}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                  >
                    <option value="">—</option>
                    {SCORES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              {/* error */}
              {error && <ErrorBanner message={error} />}

              {/* actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {setOpen(false); setEditingId(null);}}
                  className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-md bg-zinc-700 dark:bg-zinc-200 px-3 py-2 text-sm text-zinc-50 dark:text-zinc-900 hover:bg-zinc-900 dark:hover:bg-zinc-400 transition-colors">
                  {submitting ? 'Saving…' : editingId ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
