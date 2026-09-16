import { getTask, updateTask, deleteTask } from '@/lib/tasks';
import { requireOrgSession } from '@/lib/session';
import type { Task, TaskScore } from '@/types/task';

export const dynamic = 'force-dynamic';

const VALID_SCORES: TaskScore[] = [1, 2, 3, 4, 5];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = await requireOrgSession();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'deadline' | 'deadlineTime' | 'effort' | 'impact'>>;

  if (body.status !== undefined && !['todo', 'in-progress', 'done', 'blocked'].includes(body.status)) {
    return Response.json({ error: 'status must be todo | in-progress | done | blocked' }, { status: 400 });
  }
  if (body.assignedTo !== undefined &&
      (!Array.isArray(body.assignedTo) || !body.assignedTo.every((a) => typeof a === 'string'))) {
    return Response.json({ error: 'assignedTo must be an array of strings' }, { status: 400 });
  }
  if (body.effort !== undefined && !VALID_SCORES.includes(body.effort as TaskScore)) {
    return Response.json({ error: 'effort must be 1–5' }, { status: 400 });
  }
  if (body.impact !== undefined && !VALID_SCORES.includes(body.impact as TaskScore)) {
    return Response.json({ error: 'impact must be 1–5' }, { status: 400 });
  }

  const existing = await getTask(ctx.organizationId, id);
  if (!existing) {
    return Response.json({ error: 'task not found' }, { status: 404 });
  }
  if (body.deadlineTime !== undefined && !body.deadline && !existing.deadline) {
    return Response.json({ error: 'deadlineTime requires a deadline' }, { status: 400 });
  }

  const updated = await updateTask(ctx.organizationId, id, body);
  if (!updated) {
    return Response.json({ error: 'task not found' }, { status: 404 });
  }
  return Response.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = await requireOrgSession();
  if (!ctx) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const success = await deleteTask(ctx.organizationId, id);
  if (!success) {
    return Response.json({ error: 'task not found' }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}