'use client';

import { useState } from 'react';
import type { Task } from '@/types/task';
import Link from 'next/link';

export default function MeetingPage() {
  const [transcript, setTranscript] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Task[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);

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
      setSkippedCount(json.skippedCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Meeting → Action Items</h1>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Back to dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          placeholder="Paste your meeting transcript here…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !transcript.trim()}
          className="rounded-md bg-zinc-700 px-4 py-2 text-sm text-zinc-50 hover:bg-zinc-900 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Extracting…' : 'Extract Tasks'}
        </button>
      </form>

      {created && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-zinc-900 mb-3">
            Created {created.length} task{created.length === 1 ? '' : 's'}
            {skippedCount > 0 && (
              <span className="text-zinc-400 font-normal"> ({skippedCount} skipped — check server logs)</span>
            )}
          </h2>
          {created.length === 0 ? (
            <p className="text-sm text-zinc-400">No action items found in that transcript.</p>
          ) : (
            <ul className="space-y-2">
              {created.map((t) => (
                <li key={t.id} className="rounded-md border border-zinc-200 px-3 py-2 text-sm">
                  <div className="font-medium text-zinc-900">{t.title}</div>
                  <div className="text-xs text-zinc-500">
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