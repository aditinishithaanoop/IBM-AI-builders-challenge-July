export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
// Tracks how a task entered the system — used for the source badge in the table
export type TaskSource = "manual" | "meeting" | "proposal";
/** 1 (lowest) – 5 (highest), used for effort and impact scoring */
export type TaskScore  = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string[];   // list of names; stored as array, displayed as comma-joined string
  deadline?: string;       // ISO date string, e.g. "2025-12-31"
  deadlineTime?: string;   // HH:MM — only valid when deadline is also set
  effort?: TaskScore;      // user-supplied estimate of work required
  impact?: TaskScore;      // user-supplied estimate of business value
  source: TaskSource;
  rank?: number;           // priority position set by the AI prioritiser (1 = highest)
  reasoning?: string;      // one-sentence AI explanation for the assigned rank
  createdAt: string;       // ISO 8601 timestamp
}

// ─── Proposal analyser types ────────────────────────────────────────────────

export type Recommendation = 'approve' | 'revise' | 'reject';

/** A task extracted from a proposal document, before it is committed to the store */
export interface ProposedTask {
  title: string;
  description?: string;
  assignedTo?: string[];
  deadline?: string;
  deadlineTime?: string;
}

/** Full structured output returned by POST /api/proposal-analysis */
export interface ProposalAnalysis {
  summary: string;
  recommendation: Recommendation;
  recommendationReasoning: string;
  strengths: string[];
  risks: string[];
  proposedTasks: ProposedTask[];
}

