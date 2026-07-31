import { GoogleGenAI, Type } from '@google/genai';
import { getTasks } from '@/lib/tasks';
import type { ProposalAnalysis } from '@/types/task';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// POST /api/proposal-analysis
// Accepts { proposalText, projectContext? } → asks Gemini to analyse the proposal
// against the current backlog → returns a ProposalAnalysis (does NOT create tasks;
// that is a separate step via POST /api/proposal-to-tasks).
export async function POST(request: Request): Promise<Response> {
  const body = await request.json() as { proposalText?: string; projectContext?: string };

  if (!body.proposalText || typeof body.proposalText !== 'string' || !body.proposalText.trim()) {
    return Response.json({ error: 'proposalText is required' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0]; // anchor for resolving relative dates

  // Give the model awareness of what's already in flight so it avoids duplicates
  const currentBacklog = getTasks().map((t) => ({
    title: t.title,
    status: t.status,
    assignedTo: t.assignedTo ?? [],
  }));

  const prompt = `You are an assistant that analyses proposal documents (project proposals, feature proposals, or vendor/procurement proposals — infer which from the content). Today's date is ${today}.

${body.projectContext?.trim() ? `Project background, for context:\n${body.projectContext.trim()}\n` : ''}
Current task backlog, for context (avoid suggesting tasks that duplicate these, and consider existing workload when assigning owners):
${JSON.stringify(currentBacklog, null, 2)}

Read the proposal below and produce:
- summary: a neutral 2-3 sentence summary of what's being proposed
- recommendation: one of "approve", "revise", or "reject", based on how well-reasoned, scoped, and low-risk the proposal appears given the context above
- recommendationReasoning: 1-2 sentences explaining the recommendation, specific to this proposal's actual content
- strengths: a short list of genuine strengths in the proposal
- risks: a short list of genuine risks, gaps, or open questions
- proposedTasks: concrete follow-up tasks that would be needed to act on this proposal (e.g. next steps, approvals, implementation work). For each: 
  - title: a short, clear task title (required, under 12 words)
  - description: at most one sentence of extra context (omit if nothing beyond the title), under 25 words
  - assignedTo: only if the proposal names an owner — do not invent one
  - deadline: an ISO 8601 date (YYYY-MM-DD). Resolve relative dates using today's date as the anchor. If a deadline is vague or unstated, omit the field entirely rather than guessing — output only the resolved date or omit the field, do not explain your reasoning in the field itself.
  - deadlineTime: only if a specific time is stated
  - Do not assign effort or impact scores.

Proposal:
"""
${body.proposalText}
"""`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          recommendation: { type: Type.STRING, enum: ['approve', 'revise', 'reject'] },
          recommendationReasoning: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          proposedTasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                assignedTo: { type: Type.ARRAY, items: { type: Type.STRING } },
                deadline: { type: Type.STRING },
                deadlineTime: { type: Type.STRING },
              },
              required: ['title'],
            },
          },
        },
        required: ['summary', 'recommendation', 'recommendationReasoning', 'strengths', 'risks', 'proposedTasks'],
      },
    },
  });

  let analysis: ProposalAnalysis;
  try {
    analysis = JSON.parse(response.text ?? '{}');
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 502 });
  }

  // Guard against occasional model outputs where a field contains a runaway
  // repetition loop — long text or low word-diversity ratio signals degenerate output
  function looksDegenerate(text: string | undefined): boolean {
    if (!text) return false;
    if (text.length > 400) return true; // no legitimate title/description should be this long
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 20) return false;
    const uniqueRatio = new Set(words).size / words.length;
    return uniqueRatio < 0.35; // heavy repetition → low word diversity
  }
  const cleanTasks = (analysis.proposedTasks ?? []).filter(
    (t) => !looksDegenerate(t.title) && !looksDegenerate(t.description)
  );
  const filteredCount = analysis.proposedTasks.length - cleanTasks.length;
  analysis.proposedTasks = cleanTasks;

  return Response.json({ ...analysis, filteredCount });
}

