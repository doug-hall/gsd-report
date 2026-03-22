export type ActivitySource = 'github' | 'slack' | 'jira' | 'gmail' | 'calendar' | 'linear' | 'claude-code' | 'codex' | 'copilot';

export type ActivityType =
  | 'pr_created' | 'pr_reviewed' | 'pr_merged'
  | 'commit' | 'code_review_comment'
  | 'issue_created' | 'issue_updated' | 'issue_resolved'
  | 'message_sent' | 'thread_reply'
  | 'email_sent' | 'email_received'
  | 'meeting_attended'
  | 'task_completed' | 'task_created' | 'task_updated'
  | 'ai_conversation';

export interface ActivityItem {
  id: string;
  source: ActivitySource;
  type: ActivityType;
  title: string;
  description?: string;
  url?: string;
  timestamp: string; // ISO 8601
  private?: boolean; // If true, included in analysis but hidden from display
  metadata: Record<string, unknown>;
}

export interface DateRange {
  start: string; // ISO date
  end: string;   // ISO date
}

export interface AnalysisResult {
  themes: Theme[];
  categories: CategoryBreakdown[];
  narrative: string;
  executiveSummary: ExecutiveSummary;
  insights: string[];
  metrics: KeyMetrics;
}

export interface ExecutiveSummary {
  headline: string;
  accomplishments: string[];
  impact: string[];
  leadership: string[];
  body: string;
}

export interface Theme {
  name: string;
  description: string;
  activityCount: number;
  activityIds: string[];
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  sources: ActivitySource[];
}

export interface KeyMetrics {
  totalActivities: number;
  prsMerged: number;
  issuesClosed: number;
  meetingsAttended: number;
  meetingHours: number;
  messagesSent: number;
  emailsSent: number;
  commitsAuthored: number;
  aiConversations: number;
}

export interface ActivitiesResponse {
  activities: ActivityItem[];
  errors: string[];
}

export interface AnalysisResponse {
  analysis: AnalysisResult;
}
