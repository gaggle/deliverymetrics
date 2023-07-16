export interface JiraClient {
  syncSearchIssues(jql: string, opts?: Partial<{ newerThan: number; signal: AbortSignal }>): Promise<unknown>
}
