import { Task, TaskScore, TaskStatus } from '@/types/task';

// In-memory store — reset on server restart
declare global {
  var __tasks: Task[] | undefined;
}

const tasks: Task[] = globalThis.__tasks ?? (globalThis.__tasks = []);

export function getTasks(): Task[] {
  return tasks;
}

export function addTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  return newTask;
}

export function getTask(id: string): Task | null {
  return tasks.find((t) => t.id === id) ?? null;
}

export function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'deadline' | 'deadlineTime' | 'effort' | 'impact' | 'rank' | 'reasoning'>>
): Task | null {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates };
  return tasks[index];
}

export function deleteTask(id: string): boolean {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

// Re-export types so callers can import from one place if needed
export type { Task, TaskScore, TaskStatus };
