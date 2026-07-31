'use client';

/*app/meeting/page.tsx*/
import { useState } from 'react';
import type { ProposedTask } from '@/types/task';
import { ErrorBanner, EmptyState } from '@/components/StatusMessage';

export default function MeetingPage() {
  const [transcript, setTranscript] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ProposedTask[] | null>(null);
  const [skipped, setSkipped] = useState<{ item: { title?: string }; reason: string }[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addedCount, setAddedCount] = useState<number | null>(null);

// Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExtracted(null);
    setAddedCount(null);
    setExtracting(true);
    try {
      const res = await fetch('/api/meeting-to-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setExtracted(json.extracted);
      setSkipped(json.skipped ?? []);
      setSelected(new Set(json.extracted.map((_: unknown, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExtracting(false);
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
    if (!extracted) return;
    setAdding(true);
    try {
      const tasks = extracted.filter((_, i) => selected.has(i));
      const res = await fetch('/api/meeting-to-tasks', {
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

  // Strips VTT/SRT scaffolding (headers, cue indices, timestamps, voice tags)
  // so only the spoken lines are sent to the AI
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2.5 text-3xl md:text-3xl font-display font-semibold tracking-tight text-foreground">
        <span className="w-1.5 h-7 md:h-8 rounded-full bg-meeting" aria-hidden="true" />
          Meeting to Action
        </h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start print:grid-cols-1">
        <form onSubmit={handleSubmit} className="space-y-3 min-w-0">
            <div className="mb-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Upload a transcript file (.txt, .vtt, or .srt) — or just paste below
                </label>
                <input
                    type="file"
                    accept=".txt,.vtt,.srt"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:opacity-70"
                />
            </div>
            <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your meeting transcript here…"
                rows={12}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 themed-scrollbar"
            />

            {error && <ErrorBanner message={error} />}
            <button
            type="submit"
            disabled={extracting || !transcript.trim()}
            className="rounded-md bg-meeting px-4 py-2 text-sm text-white hover:bg-meeting/65 disabled:opacity-100 transition-colors"
            >
            {extracting ? 'Extracting…' : 'Extract Tasks'}
            </button>
        </form>

        <div className="space-y-3 ">
            {!extracted && (
                <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
                <p className="text-sm font-medium text-foreground mb-1">Extracted tasks will appear here</p>
                <p className="text-sm text-muted-foreground">Paste or upload a transcript on the left and extract to see the action items Claude finds.</p>
                </div>
            )}
            {extracted && (
                <div>
                  {skipped.length > 0 && (
                  <div className="mb-3 rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
                    <p className="text-xs font-medium text-warning mb-1.5">
                      Skipped {skipped.length} item{skipped.length === 1 ? '' : 's'}:
                    </p>
                    <ul className="text-sm text-warning space-y-1 break-words">
                      {skipped.map((s, i) => (
                        <li key={i}>
                          "{s.item.title ?? '(untitled)'}" — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  )}
                
                {extracted.length === 0 ? (
                    <EmptyState message="No action items found in that transcript." />
                ) : (
                  <>
                    <h2 className="text-base font-display font-semibold text-foreground mb-3">
                    Found {extracted.length} task{extracted.length === 1 ? '' : 's'} - select which to add
                    </h2>
                    <ul className="space-y-2 mb-4">
                      {extracted.map((t, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-md rounded-l-none border border-border border-l-4 border-l-meeting px-4 py-3 text-sm">
                          <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() => toggle(i)}
                            className="mt-1.5"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-base text-foreground break-words">{t.title}</div>
                            {t.description && <div className="ttext-sm text-muted-foreground break-words mt-0.5">{t.description}</div>}
                            <div className="text-sm text-muted-foreground mt-1">
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
                      className="rounded-md bg-brand hover:bg-brand-hover text-white px-3 py-1.5 text-sm font-medium disabled:opacity-60 transition-colors"
                    >
                      {adding ? 'Adding…' : `Add ${selected.size} task${selected.size === 1 ? '' : 's'} to backlog`}
                    </button>
                    {addedCount !== null && (
                      <p className="text-xs text-status-done mt-2">Added {addedCount} task{addedCount === 1 ? '' : 's'}.</p>
                    )}
                  </>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}