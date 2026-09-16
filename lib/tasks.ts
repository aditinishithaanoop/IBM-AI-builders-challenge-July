import { prisma } from '@/lib/prisma';
import type { Task, TaskScore, TaskStatus, TaskSource } from '@/types/task';

// Prisma stores status/source as plain strings (no DB-level enum) —
// app-layer validation in the routes is what keeps these honest, same as before.
function toTask(row: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  source: string;
  assignedTo: string[];
  deadline: string | null;
  deadlineTime: string | null;
  effort: number | null;
  impact: number | null;
  rank: number | null;
  reasoning: string | null;
  createdAt: Date;
}): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as TaskStatus,
    source: row.source as TaskSource,
    assignedTo: row.assignedTo.length > 0 ? row.assignedTo : undefined,
    deadline: row.deadline ?? undefined,
    deadlineTime: row.deadlineTime ?? undefined,
    effort: (row.effort ?? undefined) as TaskScore | undefined,
    impact: (row.impact ?? undefined) as TaskScore | undefined,
    rank: row.rank ?? undefined,
    reasoning: row.reasoning ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getTasks(organizationId: string): Promise<Task[]> {
  const rows = await prisma.task.findMany({ where: { organizationId } });
  return rows.map(toTask);
}

export async function getTask(organizationId: string, id: string): Promise<Task | null> {
  const row = await prisma.task.findFirst({ where: { id, organizationId } });
  return row ? toTask(row) : null;
}

export async function addTask(
  organizationId: string,
  createdById: string,
  task: Omit<Task, 'id' | 'createdAt'>
): Promise<Task> {
  const row = await prisma.task.create({
    data: {
      title: task.title,
      status: task.status,
      source: task.source,
      organizationId,
      createdById,
      ...(task.description !== undefined && { description: task.description }),
      ...(task.assignedTo !== undefined && { assignedTo: task.assignedTo }),
      ...(task.deadline !== undefined && { deadline: task.deadline }),
      ...(task.deadlineTime !== undefined && { deadlineTime: task.deadlineTime }),
      ...(task.effort !== undefined && { effort: task.effort }),
      ...(task.impact !== undefined && { impact: task.impact }),
      ...(task.rank !== undefined && { rank: task.rank }),
      ...(task.reasoning !== undefined && { reasoning: task.reasoning }),
    },
  });
  return toTask(row);
}

export async function updateTask(
  organizationId: string,
  id: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'deadline' | 'deadlineTime' | 'effort' | 'impact' | 'rank' | 'reasoning'>>
): Promise<Task | null> {
  const existing = await prisma.task.findFirst({ where: { id, organizationId } });
  if (!existing) return null;

  const row = await prisma.task.update({ where: { id }, data: updates });
  return toTask(row);
}

export async function deleteTask(organizationId: string, id: string): Promise<boolean> {
  const { count } = await prisma.task.deleteMany({ where: { id, organizationId } });
  return count > 0;
}

export type { Task, TaskScore, TaskStatus };