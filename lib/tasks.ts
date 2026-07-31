import { Task, TaskScore, TaskStatus } from '@/types/task';

// Persist the array on the Node.js global so it survives Next.js hot-reloads
// in development (where modules are re-evaluated but the process stays alive).
// In production there are no hot-reloads, so this is a no-op.
declare global {
  var __tasks: Task[] | undefined;
}

const tasks: Task[] = globalThis.__tasks ?? (globalThis.__tasks = []);

export function getTasks(): Task[] {
  return tasks;
}

/** Generates id and createdAt automatically; caller supplies everything else. */
export function addTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  return newTask;
}

/** Returns null when no task with that id exists. */
export function getTask(id: string): Task | null {
  return tasks.find((t) => t.id === id) ?? null;
}

/**
 * Merges `updates` into the matching task in-place.
 * Returns the updated task, or null if the id was not found.
 * `source`, `id`, and `createdAt` are intentionally not patchable here.
 */
export function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'deadline' | 'deadlineTime' | 'effort' | 'impact' | 'rank' | 'reasoning'>>
): Task | null {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates };
  return tasks[index];
}

/** Returns false when no task with that id exists. */
export function deleteTask(id: string): boolean {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

// Re-export types so callers can import from one place if needed
export type { Task, TaskScore, TaskStatus };
