import { getTasks, addTask } from '@/lib/tasks';
import { requireOrgSession } from '@/lib/session';
import type { Task, TaskScore } from '@/types/task';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['todo', 'in-progress', 'done', 'blocked'] as const;
const VALID_SCORES: TaskScore[] = [1, 2, 3, 4, 5];

export async function GET(): Promise<Response> {
  const ctx = await requireOrgSession();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });

  return Response.json(await getTasks(ctx.organizationId));
}

export async function POST(request: Request): Promise<Response> {
  const ctx = await requireOrgSession();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json() as Partial<Task>;

  if (!body.title || typeof body.title !== 'string') {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }
  if (!body.status || !(VALID_STATUSES as readonly string[]).includes(body.status)) {
    return Response.json({ error: 'status must be todo | in-progress | done | blocked' }, { status: 400 });
  }
  if (body.effort !== undefined && !VALID_SCORES.includes(body.effort as TaskScore)) {
    return Response.json({ error: 'effort must be 1–5' }, { status: 400 });
  }
  if (body.impact !== undefined && !VALID_SCORES.includes(body.impact as TaskScore)) {
    return Response.json({ error: 'impact must be 1–5' }, { status: 400 });
  }
  if (body.assignedTo !== undefined &&
      (!Array.isArray(body.assignedTo) || !body.assignedTo.every((a) => typeof a === 'string'))) {
    return Response.json({ error: 'assignedTo must be an array of strings' }, { status: 400 });
  }
  if (body.deadlineTime !== undefined && !body.deadline) {
    return Response.json({ error: 'deadlineTime requires a deadline to be set' }, { status: 400 });
  }

  const task = await addTask(ctx.organizationId, ctx.userId, {
    title: body.title,
    status: body.status,
    source: 'manual',
    ...(body.description !== undefined && { description: body.description }),
    ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
    ...(body.deadline !== undefined && { deadline: body.deadline }),
    ...(body.deadlineTime !== undefined && { deadlineTime: body.deadlineTime }),
    ...(body.effort !== undefined && { effort: body.effort as TaskScore }),
    ...(body.impact !== undefined && { impact: body.impact as TaskScore }),
  });

  return Response.json(task, { status: 201 });
}