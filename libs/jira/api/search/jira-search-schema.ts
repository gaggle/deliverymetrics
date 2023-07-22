import { z } from "zod"

import { jiraPaginationFieldsSchema } from "../../jira-pagination-fields-schema.ts"

const jiraSearchIssueChangelogHistoryItemSchema = z.object({
  field: z.string().optional(),
  fieldtype: z.string().optional(),
  fieldId: z.string().optional(),
  from: z.string().nullable().optional(),
  fromString: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  toString: z.any(),
  // ↑ This is supposed to be `z.string().nullable().optional()`,
  // but actually Typescript and/or Zod gets confused over the `toString` field-name
  // because it conflicts with built-in toString method.
  // It causes the type to be a union of the Zod type + the built-in method's type (string | ()=>string).
})

const jiraSearchIssueChangelogHistorySchema = z
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
        accountType: z.string().optional(),
      })
      .optional(),
    created: z.string().optional(),
    items: z.array(jiraSearchIssueChangelogHistoryItemSchema).optional(),
    historyMetadata: z.object({
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
      .optional(),
  })

const jiraSearchIssueTransitionSchema = z
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
          .optional(),
      })
      .optional(),
    hasScreen: z.boolean().optional(),
    isGlobal: z.boolean().optional(),
    isInitial: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    isConditional: z.boolean().optional(),
    isLooped: z.boolean().optional(),
    fields: z
      .object({})
      .catchall(z.any())
      .optional(),
    expand: z.string().optional(),
  })

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
      .optional(),
    names: z
      .object({})
      .catchall(z.any())
      .optional(),
    schema: z
      .object({})
      .catchall(z.any())
      .optional(),
    transitions: z.array(jiraSearchIssueTransitionSchema).optional(),
    operations: z
      .object({ linkGroups: z.array(z.any()).optional() })
      .optional(),
    editmeta: z
      .object({
        fields: z
          .object({})
          .catchall(z.any())
          .optional(),
      })
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
        histories: z.array(jiraSearchIssueChangelogHistorySchema).optional(),
      }).optional(),
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

export type JiraSearchIssue = z.infer<typeof jiraSearchIssueSchema>

export const dbJiraSearchIssueSchema = z.object({
  issue: jiraSearchIssueSchema,
  issueKey: z.string().optional(),
  issueId: z.string().optional(),
  namesHash: z.string().optional(),
})

export type DBJiraSearchIssue = z.infer<typeof dbJiraSearchIssueSchema>

export const jiraSearchNamesSchema = z.record(z.string(), z.string())

export type JiraSearchNames = z.infer<typeof jiraSearchNamesSchema>

export const dbJiraSearchNamesSchema = z.object({ hash: z.string(), names: jiraSearchNamesSchema })

export type DBJiraSearchNames = z.infer<typeof dbJiraSearchNamesSchema>

export const jiraSearchSchemaSchema = z.object({}).catchall(z.any())

export type JiraSearchSchema = z.infer<typeof jiraSearchSchemaSchema>

export const jiraSearchResponseSchema = jiraPaginationFieldsSchema.extend({
  expand: z.string().optional(),
  issues: z.array(jiraSearchIssueSchema).optional(),
  warningMessages: z.array(z.string()).optional(),
  names: jiraSearchNamesSchema.optional(),
  schema: jiraSearchSchemaSchema.optional(),
})

export type JiraSearchResponse = z.infer<typeof jiraSearchResponseSchema>
