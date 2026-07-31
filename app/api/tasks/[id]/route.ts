import { getTask, updateTask, deleteTask } from '@/lib/tasks';
import type { Task, TaskScore } from '@/types/task';

const VALID_SCORES: TaskScore[] = [1, 2, 3, 4, 5];

// PATCH /api/tasks/:id — partial update; source, id, and createdAt cannot be changed
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
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

  // Fetch early so we can validate deadlineTime against the persisted deadline
  const existing = getTask(id);
  if (!existing) {
    return Response.json({ error: 'task not found' }, { status: 404 });
  }
  // Reject a time-only update when neither the patch nor the stored task has a date
  if (body.deadlineTime !== undefined && !body.deadline && !existing.deadline) {
    return Response.json({ error: 'deadlineTime requires a deadline' }, { status: 400 });
  }

  const updated = updateTask(id, body);
  if (!updated) {
    return Response.json({ error: 'task not found' }, { status: 404 });
  }
  return Response.json(updated);
}

// DELETE /api/tasks/:id — returns 204 No Content on success
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const success = deleteTask(id);
  if (!success) {
    return Response.json({ error: 'task not found' }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
