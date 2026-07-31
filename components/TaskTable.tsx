'use client';

/*components/TaskTable.tsx*/
import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, TaskScore, TaskStatus, TaskSource } from '@/types/task';
import { ErrorBanner, EmptyState } from '@/components/StatusMessage';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done', 'blocked'];
const SCORES: TaskScore[] = [1, 2, 3, 4, 5];

// Tailwind classes for each status chip — keeps the JSX clean
const STATUS_BADGE: Record<TaskStatus, string> = {
  'todo':        'bg-status-todo/15 text-status-todo',
  'in-progress': 'bg-status-progress/15 text-status-progress',
  'done':        'bg-status-done/15 text-status-done',
  'blocked':     'bg-status-blocked/15 text-status-blocked'
};

const SOURCE_BADGE: Record<TaskSource, string> = {
  manual:   '',
  meeting:  'bg-meeting/15 text-meeting',
  proposal: 'bg-proposal/15 text-proposal',
};

const SOURCE_LABEL: Record<TaskSource, string> = {
  manual:   '',
  meeting:  'Meeting',
  proposal: 'Proposal',
};

const COLS = ['Rank', 'Title', 'Status', 'Assigned To', 'Deadline', 'Effort', 'Impact'] as const;

// Renders a 5-dot indicator, e.g. effort=3 → "●●●○○"
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
  const [open, setOpen]         = useState(false);     // modal open/closed
  const [form, setForm]         = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null); // row detail expansion
  const [editingId, setEditingId] = useState<string | null>(null);   // null = new task, string = edit mode
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
  // Shared submit handler for both "new task" (POST) and "edit task" (PATCH)
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
  // Returns value + onChange props for a controlled string/select field
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
        <h2 className="flex items-center gap-2.5 text-3xl md:text-3xl font-display font-semibold tracking-tight text-foreground">
          <span className="w-1.5 h-7 md:h-8 rounded-full bg-brand" aria-hidden="true" />
          Tasks
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrioritize}
            disabled={prioritizing || tasks.length === 0}
            className="rounded-md border border-border bg-surface border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50 transition-colors"
          >
            {prioritizing ? 'Ranking…' : 'Rank Backlog'}
          </button>
          <button
            onClick={() => { setOpen(true); setError(null); }}
            className="rounded-md bg-brand-hover border-border px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover/65 transition-colors"
          >
            + Add Task
          </button>
        </div>
      </div>
      {prioritizeError && <div className="mb-4"><ErrorBanner message={prioritizeError} /></div>}

      {/* table */}
      <div className="overflow-x-auto rounded-lg border border-border themed-scrollbar">
        <table className="min-w-full text-sm text-left table-fixed">
          <thead className="bg-background text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <tr>
              {COLS.map((col) => (
                <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {loading ? (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-8 text-center text-muted-foreground">
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
                    className="hover:bg-background transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <td className="px-4 py-3 text-muted-foreground font-medium">{t.rank ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-xs">
                       <div className="flex items-center gap-2 min-w-0">
                        <span className={expandedId === t.id ? "whitespace-normal break-words" : "truncate"}>
                          {t.title}
                        </span>
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
                    <td className="px-4 py-3 text-muted-foreground">{t.assignedTo?.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {t.deadline ? `${t.deadline}${t.deadlineTime ? ' ' + t.deadlineTime : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tracking-tighter">{dots(t.effort)}</td>
                    <td className="px-4 py-3 text-muted-foreground tracking-tighter">{dots(t.impact)}</td>
                  </tr>
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={COLS.length} className="px-4 py-4 bg-background">
                        <div className="flex flex-col gap-2 max-w-2xl">
                          {t.description && (
                            <div className="text-sm text-foreground/90 whitespace-normal break-words leading-relaxed">
                              {t.description}
                            </div>
                          )}
                          {t.reasoning && (
                            <div className="text-sm text-muted-foreground italic whitespace-normal break-words leading-relaxed">
                              Reasoning: {t.reasoning}
                            </div>
                          )}
                          <div className="flex justify-start gap-2 pt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditClick(t); }}
                              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand hover:text-brand transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                              className="rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition-colors"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border shadow-lg p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">
              {editingId ? 'Edit Task' : 'New Task'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title <span className="text-danger">*</span></label>
                <input
                  ref={firstField}
                  required
                  {...field('title')}
                  placeholder="e.g. Migrate authentication"
                  className="w-full rounded-lg border border-muted-foreground bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
                />
              </div>

              {/* status */}
              <div className="relative">
                <label className="block text-sm font-medium text-foreground mb-1.5">Status <span className="text-danger">*</span></label>
                <select
                  {...field('status')}
                  className="w-full appearance-none rounded-lg border border-muted-foreground bg-surface pl-3 pr-9 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Assigned To</label>
                <input
                  {...field('assignedTo')}
                  placeholder="e.g. Alice, Bob"
                  className="w-full rounded-lg border border-muted-foreground bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Deadline</label>
                  <input type="date" 
                    {...field('deadline')} 
                    className="w-full rounded-lg border border-muted-foreground bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <input
                      type="checkbox"
                      checked={form.includeTime}
                      onChange={(e) => setForm((f) => ({ ...f, includeTime: e.target.checked }))}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
                    />
                    {" "} Include time
                  </label>
                  {form.includeTime && (
                    <input type="time" 
                      {...field('deadlineTime')} 
                      className="w-full rounded-lg border border-muted-foreground bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors" />
                  )}
                </div>
              </div>

              {/* effort + impact side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Effort (1-5)</label>
                  <select
                    {...field('effort')}
                    className="w-full appearance-none rounded-lg border border-muted-foreground bg-surface pl-3 pr-9 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
                  >
                    <option value="">-</option>
                    {SCORES.map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Impact (1-5)</label>
                  <select
                    {...field('impact')}
                    className="w-full appearance-none rounded-lg border border-muted-foreground bg-surface pl-3 pr-9 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
                  >
                    <option value="">-</option>
                    {SCORES.map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-muted-foreground bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors themed-scrollbar"
                />
              </div>

              {/* error */}
              {error && <ErrorBanner message={error} />}

              {/* actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {setOpen(false); setEditingId(null);}}
                  className="rounded-md border border-border bg-surface border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-background transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-md bg-brand px-3 py-2 text-sm text-zinc-50 hover:bg-brand-hover transition-colors">
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
