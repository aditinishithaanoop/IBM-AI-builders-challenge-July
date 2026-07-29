'use client';

import { useState } from 'react';
import type { Task } from '@/types/task';
import { ErrorBanner, EmptyState } from '@/components/StatusMessage';

export default function MeetingPage() {
  const [transcript, setTranscript] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Task[] | null>(null);
  const [skipped, setSkipped] = useState<{ item: { title?: string }; reason: string }[]>([]);

// Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/meeting-to-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setCreated(json.created);
      setSkipped(json.skipped ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const parseCaptionFile = (raw: string): string => {
    const timestampRe = /^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/;
    const cueIndexRe = /^\d+$/;
    const lines = raw.split(/\r?\n/);
    const out: string[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'WEBVTT') continue;
        if (timestampRe.test(trimmed)) continue;
        if (cueIndexRe.test(trimmed)) continue;
        const cleaned = trimmed.replace(/<\/?v[^>]*>/g, '').trim(); // strip <v Speaker> voice tags
        if (cleaned) out.push(cleaned);
    }
    return out.join('\n');
  };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const isCaptionFile = /\.(vtt|srt)$/i.test(file.name);
    setTranscript(isCaptionFile ? parseCaptionFile(text) : text);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Meeting → Action Items</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="mb-2">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Upload a transcript file (.txt, .vtt, or .srt) — or just paste below
            </label>
            <input
                type="file"
                accept=".txt,.vtt,.srt"
                onChange={handleFileChange}
                className="block w-full text-sm text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 dark:file:text-zinc-100 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700"
            />
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          placeholder="Paste your meeting transcript here…"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
        {error && <ErrorBanner message={error} />}
        <button
          type="submit"
          disabled={submitting || !transcript.trim()}
          className="rounded-md bg-zinc-200 dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-500 dark:hover:bg-zinc-700 hover:text-zinc-50 disabled:opacity-100 transition-colors"
        >
          {submitting ? 'Extracting…' : 'Extract Tasks'}
        </button>
      </form>

      {created && (
        <div className="mt-8">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
            Created {created.length} task{created.length === 1 ? '' : 's'}
            </h2>
            {skipped.length > 0 && (
              <div className="mb-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 px-3 py-2">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                Skipped {skipped.length} item{skipped.length === 1 ? '' : 's'}:
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                  {skipped.map((s, i) => (
                    <li key={i}>
                      "{s.item.title ?? '(untitled)'}" — {s.reason}
                    </li>
                 ))}
                </ul>
            </div>
            )}
          
          {created.length === 0 ? (
            <EmptyState message="No action items found in that transcript." />
          ) : (
            <ul className="space-y-2">
              {created.map((t) => (
                <li key={t.id} className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm">
                  <div className="font-medium text-zinc-900 dark:text-zinc-200">{t.title}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t.assignedTo?.join(', ') || 'Unassigned'}
                    {t.deadline && ` · due ${t.deadline}${t.deadlineTime ? ' ' + t.deadlineTime : ''}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}