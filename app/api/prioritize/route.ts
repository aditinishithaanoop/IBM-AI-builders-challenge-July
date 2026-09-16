import { GoogleGenAI, Type } from '@google/genai';
import { getTasks, updateTask } from '@/lib/tasks';
import { requireOrgSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(): Promise<Response> {
  const ctx = await requireOrgSession();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const tasks = await getTasks(ctx.organizationId);

  if (tasks.length === 0) {
    return Response.json({ error: 'No tasks to prioritize' }, { status: 400 });
  }

  const taskSummaries = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? '',
    status: t.status,
    effort: t.effort ?? null,
    impact: t.impact ?? null,
    deadline: t.deadline ?? null,
  }));

  const prompt = `You are a project prioritization assistant. Given this list of tasks (with user-supplied effort and impact ratings from 1-5, where available), rank them by priority — considering impact, effort, and deadline urgency together. For each task, give a rank (1 = highest priority) and a short reasoning (1 sentence, specific to that task's actual fields, not generic).

Tasks:
${JSON.stringify(taskSummaries, null, 2)}

Return your ranking for every task id given.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            rank: { type: Type.INTEGER },
            reasoning: { type: Type.STRING },
          },
          required: ['id', 'rank', 'reasoning'],
        },
      },
    },
  });

  let results: { id: string; rank: number; reasoning: string }[];
  try {
    results = JSON.parse(response.text ?? '[]');
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 502 });
  }

  for (const r of results) {
    await updateTask(ctx.organizationId, r.id, { rank: r.rank, reasoning: r.reasoning });
  }

  return Response.json({ success: true, count: results.length });
}