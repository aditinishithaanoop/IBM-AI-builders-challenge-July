import { GoogleGenAI, Type } from '@google/genai';
import { addTask } from '@/lib/tasks';
import type { Task, TaskScore } from '@/types/task';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ExtractedTask {
  title: string;
  description?: string;
  assignedTo?: string[];
  deadline?: string;
  deadlineTime?: string;
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json() as { transcript?: string };

  if (!body.transcript || typeof body.transcript !== 'string' || !body.transcript.trim()) {
    return Response.json({ error: 'transcript is required' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const prompt = `You are an assistant that extracts action items from meeting transcripts. Today's date is ${today}.

Read the transcript below and identify every concrete task, decision, or action item that was assigned or agreed on. For each one, extract:
- title: a short, clear task title (required)
- description: 1 sentence of extra context, only if the transcript gives more detail than the title
- assignedTo: array of names explicitly mentioned as owning this task (omit if no owner was stated — do not guess)
- deadline: an ISO 8601 date (YYYY-MM-DD) if a date or relative date ("by Friday", "end of month") was mentioned — resolve relative dates using today's date. Omit if no deadline was mentioned.
- deadlineTime: an HH:MM time, only if a specific time was mentioned alongside the deadline.

Do not invent tasks that weren't discussed. Do not assign effort/impact scores. If nothing actionable is in the transcript, return an empty array.

Transcript:
"""
${body.transcript}
"""`;

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
  });

  let extracted: ExtractedTask[];
  try {
    extracted = JSON.parse(response.text ?? '[]');
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 502 });
  }

  const created: Task[] = [];
  const skipped: { item: ExtractedTask; reason: string }[] = [];

  for (const item of extracted) {
    if (!item.title || typeof item.title !== 'string') {
      skipped.push({ item, reason: 'missing title' });
      continue;
    }
    if (item.assignedTo !== undefined &&
        (!Array.isArray(item.assignedTo) || !item.assignedTo.every((a) => typeof a === 'string'))) {
      skipped.push({ item, reason: 'invalid assignedTo' });
      continue;
    }
    if (item.deadlineTime !== undefined && !item.deadline) {
      // drop the stray time rather than reject the whole task
      delete item.deadlineTime;
    }

    const task = addTask({
      title: item.title,
      status: 'todo',
      source: 'meeting',
      ...(item.description !== undefined && { description: item.description }),
      ...(item.assignedTo !== undefined && { assignedTo: item.assignedTo }),
      ...(item.deadline !== undefined && { deadline: item.deadline }),
      ...(item.deadlineTime !== undefined && { deadlineTime: item.deadlineTime }),
    });
    created.push(task);
  }

  return Response.json({ created, skippedCount: skipped.length });
}