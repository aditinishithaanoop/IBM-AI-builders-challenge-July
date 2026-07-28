export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
export type TaskSource = "manual" | "meeting";
export type TaskScore  = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string[];
  deadline?: string; // ISO date string
  deadlineTime?: string; // optional
  effort?: TaskScore; // 1-5, user-supplied
  impact?: TaskScore; // 1-5, user-supplied
  source: TaskSource;
  rank?: number; // populated after prioritizer runs
  reasoning?: string; // populated after prioritizer runs
  createdAt: string; // ISO 8601
}

