import { z } from "zod"

import { jiraSearchRestApiSpec } from "./search/mod.ts"

export const jiraRestSpec = {
  /**
   * https://docs.atlassian.com/software/jira/docs/api/REST/1000.919.0/#api/2/search
   */
  search: jiraSearchRestApiSpec,
} as const

export interface JiraRestSpec {
  search: {
    Schema: z.infer<typeof jiraRestSpec.search.schema>
  }
}
