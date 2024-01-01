import { assertEquals, assertObjectMatch } from "dev:asserts"

import { DeepPartial } from "../../utils/types.ts"

import { ExtractedStateTransition } from "../metrics/jira-transition-data.ts"

import { transitionsStatusChangeParser } from "./transitions-status-change-parser.ts"

Deno.test("takes the first completion into account", () => {
  const transitions = [
    getStatusTransition({ created: 0, fromString: "To Do", toString: "In Progress" }),
    getStatusTransition({ created: 1000, fromString: "In Progress", toString: "Done", duration: 1000 }),
    getStatusTransition({ created: 2000, fromString: "Finished", toString: "Finished", duration: 1000 }),
  ]

  const result = transitionsStatusChangeParser(transitions, {
    plannedStates: ["Backlog", "To Do"],
    inProgressStates: ["In Progress", "Review"],
    completedStates: ["Done", "Finished", "Closed"],
  })

  assertObjectMatch(result, { inProgress: 0, completed: 1000 })
})

Deno.test("discards a move back to backlog after it's already been in progress", () => {
  const transitions = [
    getStatusTransition({ created: 0, fromString: "Backlog", toString: "In Progress" }),
    getStatusTransition({ created: 1000, fromString: "In Progress", toString: "Review", duration: 1000 }),
    getStatusTransition({ created: 2000, fromString: "In Progress", toString: "Backlog", duration: 1000 }),
  ]

  const result = transitionsStatusChangeParser(transitions, {
    plannedStates: ["Backlog", "To Do"],
    inProgressStates: ["In Progress", "Review"],
    completedStates: ["Done", "Finished", "Closed"],
  })

  assertObjectMatch(result, { inProgress: 0 })
})

Deno.test("only analyzes status-fieldId transitions", () => {
  const base = { "displayName": "Mr. Example", "emailAddress": "example@atlassian.com" }

  const transitions: ExtractedStateTransition[] = [
    {
      ...base,
      type: "resolution-fieldId",
      created: 1000,
      from: null,
      fromString: null,
      to: "10000",
      toString: "Done",
    },
    getStatusTransition({ created: 1000, fromString: "In Progress", toString: "Done", duration: 1000 }),
    {
      ...base,
      type: "Key-field",
      created: 2000,
      from: null,
      fromString: "NRG-100",
      to: null,
      toString: "NRGT-402",
    },
  ]

  const result = transitionsStatusChangeParser(transitions, {
    plannedStates: ["Backlog", "To Do"],
    inProgressStates: ["In Progress", "Review"],
    completedStates: ["Done", "Finished", "Closed"],
  })

  assertObjectMatch(result, { completed: 1000 })
})

for (
  const { name, data, expected } of [
    {
      name: "moving between planned states",
      data: [
        getStatusTransition({ created: 0, fromString: "Backlog", toString: "To Do" }),
        getStatusTransition({ created: 30000000, fromString: "To Do", toString: "Backlog", duration: 30000000 }),
      ],
      expected: [
        "Transitioned to planned state at 1970-01-01T00:00:00Z with status 'To Do'",
        "State still planned 8h20m later (status changed to 'Backlog')",
      ],
    },
    {
      name: "moving between inProgress states",
      data: [
        getStatusTransition({ created: 0, fromString: "In Progress", toString: "Review" }),
        getStatusTransition({ created: 260000000, fromString: "Review", toString: "In Progress", duration: 260000000 }),
      ],
      expected: [
        "Transitioned to inProgress state at 1970-01-01T00:00:00Z with status 'Review'",
        "State still inProgress at 1970-01-04T00:13:20Z (after 3d13m) (status changed to 'In Progress')",
      ],
    },
    {
      name: "moving between completed states",
      data: [
        getStatusTransition({ created: 0, fromString: "Done", toString: "Finished" }),
        getStatusTransition({ created: 30000000, fromString: "Finished", toString: "Closed", duration: 30000000 }),
        getStatusTransition({ created: 40000000, fromString: "Closed", toString: "Done", duration: 10000000 }),
      ],
      expected: [
        "Transitioned to completed state at 1970-01-01T00:00:00Z with status 'Finished'",
        "State still completed 8h20m later (status changed to 'Closed')",
        "State still completed 2h46m later (status changed to 'Done')",
      ],
    },
    {
      name: "moving back to backlog",
      data: [
        getStatusTransition({ created: 0, fromString: "Backlog", toString: "In Progress" }),
        getStatusTransition({ created: 30000000, fromString: "In Progress", toString: "Backlog", duration: 30000000 }),
      ],
      expected: [
        "Transitioned to inProgress state at 1970-01-01T00:00:00Z with status 'In Progress'",
        "Ignored transition to planned state 8h20m later, as state has already been inProgress (status changed to 'Backlog')",
      ],
    },
    {
      name: "moving back to inProgress",
      data: [
        getStatusTransition({ created: 0, fromString: "In Progress", toString: "Finished" }),
        getStatusTransition({ created: 30000000, fromString: "Finished", toString: "In Progress", duration: 30000000 }),
      ],
      expected: [
        "Transitioned to completed state at 1970-01-01T00:00:00Z with status 'Finished'",
        "Ignored transition to inProgress state 8h20m later, as state has already been completed (status changed to 'In Progress')",
      ],
    },
  ] as { name: string; data: ExtractedStateTransition[]; expected: string[] }[]
) {
  Deno.test(`Explains the events of ${name}`, () => {
    const result = transitionsStatusChangeParser(data, {
      plannedStates: ["Backlog", "To Do"],
      inProgressStates: ["In Progress", "Review"],
      completedStates: ["Done", "Finished", "Closed"],
    })

    assertEquals(result.eventLog, expected)
  })
}

function getStatusTransition(partial: DeepPartial<ExtractedStateTransition> = {}): ExtractedStateTransition {
  const fromString = partial.fromString || "To Do"
  const toString = partial.toString || "In Progress"
  delete partial.from
  delete partial.to
  const base: ExtractedStateTransition = {
    type: "status-fieldId",
    displayName: "Mr. Example",
    emailAddress: "example@atlassian.com",
    created: 0,
    from: simpleHashToNumber(fromString).toString(),
    fromString: fromString,
    to: simpleHashToNumber(toString).toString(),
    toString: toString,
    duration: undefined,
  }
  return { ...base, ...partial }
}

function simpleHashToNumber(s: string): number {
  return Math.abs(s.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0))
}
