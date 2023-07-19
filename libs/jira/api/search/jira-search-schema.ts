import { z } from "zod"

import { jiraPaginationFieldsSchema } from "../../jira-pagination-fields-schema.ts"

export const jiraSearchIssueSchema = z
  .object({
    expand: z.string().optional(),
    id: z.string().optional(),
    self: z
      .string()
      .url()
      .optional(),
    key: z.string().optional(),
    renderedFields: z
      .object({})
      .catchall(z.any())
      .optional(),
    properties: z
      .object({
        properties: z
          .object({})
          .catchall(z.any())
          .optional(),
      })
      .strict()
      .optional(),
    names: z
      .object({})
      .catchall(z.any())
      .optional(),
    schema: z
      .object({})
      .catchall(z.any())
      .optional(),
    transitions: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            to: z
              .object({
                self: z.string().optional(),
                statusColor: z.string().optional(),
                description: z.string().optional(),
                iconUrl: z.string().optional(),
                name: z.string().optional(),
                id: z.string().optional(),
                statusCategory: z
                  .object({
                    self: z.string().optional(),
                    id: z
                      .number()
                      .int()
                      .optional(),
                    key: z.string().optional(),
                    colorName: z.string().optional(),
                    name: z.string().optional(),
                  })
                  .strict()
                  .optional(),
              })
              .strict()
              .optional(),
            hasScreen: z.boolean().optional(),
            fields: z
              .object({})
              .catchall(z.any())
              .optional(),
            expand: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
    operations: z
      .object({ linkGroups: z.array(z.any()).optional() })
      .strict()
      .optional(),
    editmeta: z
      .object({
        fields: z
          .object({})
          .catchall(z.any())
          .optional(),
      })
      .strict()
      .optional(),
    changelog: z
      .object({
        startAt: z
          .number()
          .int()
          .optional(),
        maxResults: z
          .number()
          .int()
          .optional(),
        total: z
          .number()
          .int()
          .optional(),
        histories: z
          .array(
            z
              .object({
                id: z.string().optional(),
                author: z
                  .object({
                    self: z.string().optional(),
                    name: z.string().optional(),
                    key: z.string().optional(),
                    accountId: z.string().optional(),
                    emailAddress: z.string().optional(),
                    avatarUrls: z
                      .object({})
                      .catchall(z.any())
                      .optional(),
                    displayName: z.string().optional(),
                    active: z.boolean(),
                    timeZone: z.string().optional(),
                  })
                  .strict()
                  .optional(),
                created: z.string().optional(),
                items: z
                  .array(
                    z
                      .object({
                        field: z.string().optional(),
                        fieldtype: z.string().optional(),
                        from: z.string().optional(),
                        fromString: z.string().optional(),
                        to: z.string().optional(),
                        toString: z.string().optional(),
                      })
                      .strict(),
                  )
                  .optional(),
                historyMetadata: z
                  .object({
                    type: z.string().optional(),
                    description: z.string().optional(),
                    descriptionKey: z.string().optional(),
                    activityDescription: z.string().optional(),
                    activityDescriptionKey: z.string().optional(),
                    emailDescription: z.string().optional(),
                    emailDescriptionKey: z.string().optional(),
                    actor: z.any().optional(),
                    generator: z.any().optional(),
                    cause: z.any().optional(),
                    extraData: z
                      .object({})
                      .catchall(z.any())
                      .optional(),
                  })
                  .strict()
                  .optional(),
              })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
    versionedRepresentations: z
      .object({})
      .catchall(z.any())
      .optional(),
    fieldsToInclude: z
      .object({})
      .catchall(z.any())
      .optional(),
    fields: z
      .object({})
      .catchall(z.any())
      .optional(),
  })
  .strict()

export type JiraSearchIssue = z.infer<typeof jiraSearchIssueSchema>

export const dbJiraSearchIssueSchema = z.object({
  issue: jiraSearchIssueSchema,
  issueKey: z.string().optional(),
  issueId: z.string().optional(),
  namesHash: z.string().optional(),
})

export type DBJiraSearchIssue = z.infer<typeof dbJiraSearchIssueSchema>

export const jiraSearchNamesSchema = z
  .object({})
  .catchall(z.any())

export type JiraSearchNames = z.infer<typeof jiraSearchNamesSchema>

export const dbJiraSearchNamesSchema = z.object({ hash: z.string(), names: jiraSearchNamesSchema })

export type DBJiraSearchNames = z.infer<typeof dbJiraSearchNamesSchema>

export const jiraSearchSchemaSchema = z
  .object({})
  .catchall(z.any())

export type JiraSearchSchema = z.infer<typeof jiraSearchSchemaSchema>

export const jiraSearchResponseSchema = jiraPaginationFieldsSchema.extend({
  expand: z.string().optional(),
  issues: z.array(jiraSearchIssueSchema).optional(),
  warningMessages: z.array(z.string()).optional(),
  names: jiraSearchNamesSchema.optional(),
  schema: jiraSearchSchemaSchema.optional(),
})
  .strict()

export type JiraSearchResponse = z.infer<typeof jiraSearchResponseSchema>
