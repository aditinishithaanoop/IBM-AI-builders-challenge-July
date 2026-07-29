import { addTask } from '@/lib/tasks';
import type { Task, ProposedTask } from '@/types/task';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json() as { tasks?: ProposedTask[] };

  if (!body.tasks || !Array.isArray(body.tasks)) {
    return Response.json({ error: 'tasks must be an array' }, { status: 400 });
  }

  const created: Task[] = [];
  const skipped: { item: ProposedTask; reason: string }[] = [];

  for (const item of body.tasks) {
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
      delete item.deadlineTime;
    }

    const task = addTask({
      title: item.title,
      status: 'todo',
      source: 'proposal',
      ...(item.description !== undefined && { description: item.description }),
      ...(item.assignedTo !== undefined && { assignedTo: item.assignedTo }),
      ...(item.deadline !== undefined && { deadline: item.deadline }),
      ...(item.deadlineTime !== undefined && { deadlineTime: item.deadlineTime }),
    });
    created.push(task);
  }

  return Response.json({ created, skipped });
}