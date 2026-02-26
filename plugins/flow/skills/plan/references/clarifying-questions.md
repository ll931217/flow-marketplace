# Clarifying Questions

## Overview

Before writing the PRD, the AI must ask clarifying questions using the `AskUserQuestion` tool. This provides an interactive UI where users select options with keyboard navigation.

## Question Strategy

- Ask **3-5 clarifying questions at a time** to avoid overwhelming the user
- Prioritize the most critical unknowns first
- Iterate: refine questions based on previous answers
- Stop when requirements are sufficiently clear for PRD generation

## AskUserQuestion Format

```
AskUserQuestion({
  questions: [
    {
      question: "What is the primary goal of this feature?",
      header: "Goal",
      options: [
        {
          label: "Solve a specific problem",
          description: "Address an existing pain point"
        },
        {
          label: "Add new capability",
          description: "Enable something not currently possible"
        },
        {
          label: "Improve experience",
          description: "Enhance existing functionality"
        }
      ],
      multiSelect: false
    }
  ]
})
```

**Key guidelines:**
- **header**: Short label (max 12 chars) displayed as a chip/tag
- **question**: Clear question text ending with a question mark
- **options**: 2-4 options with concise labels and helpful descriptions
- **multiSelect**: Set to `true` when multiple options can apply (e.g., user roles)
- The tool automatically provides an "Other" option for custom input
- Always use `AskUserQuestion` -- do NOT use letter/number lists

## Question Categories

### Business Context

- **Problem/Goal:** "What problem does this feature solve for the user?" or "What is the main goal?"
- **Target User:** "Who is the primary user of this feature?"
- **Priority/Timeline:** "What is the priority or target timeline?"
- **Similar Features:** "Are there existing features similar to this we should reference?"

### Functional Scope

- **Core Functionality:** "What key actions should a user be able to perform?"
- **User Stories:** "Could you provide user stories? (As a [user], I want to [action] so that [benefit].)"
- **Acceptance Criteria:** "How will we know when this feature is successfully implemented?"
- **Scope/Boundaries:** "Are there specific things this feature should NOT do (non-goals)?"
- **Edge Cases:** "Are there potential edge cases or error conditions to consider?"

### Technical Context

- **Data Requirements:** "What data does this feature need to display or manipulate?"
- **Existing Systems:** "Are there existing systems, APIs, or modules this should integrate with?"
- **Constraints:** "Are there known technical constraints or dependencies?"

### Architecture Patterns

- **Pattern Preferences:** "Which architectural patterns should be considered?"
  - Factory pattern for object creation
  - Registry pattern for dynamic lookup
  - IoC/DI for dependency management
  - SOLID principles review
  - None needed for this feature
- **Code Organization:** "Any architectural constraints or preferences?"
  - Layered architecture (controllers, services, repositories)
  - Microservice boundaries
  - Domain-driven design (aggregates, repositories)
  - No specific preference
- **Extensibility Needs:** "Should this feature be designed for extension?"
  - Plugin system needed
  - Strategy pattern for variants
  - No extensibility requirements

### UX/Design

- **Design/UI:** "Are there existing design mockups or UI guidelines to follow?"
- **Accessibility:** "Are there accessibility requirements to consider?"
- **Responsive/Mobile:** "Does this need to work on mobile or different screen sizes?"

### Non-Functional Requirements

- **Performance:** "Are there performance requirements or expectations?"
- **Security/Privacy:** "Are there security or privacy considerations?"
- **Internationalization:** "Does this need to support multiple languages?"

## Iteration Rules

1. After receiving answers, analyze for gaps or ambiguities
2. Ask follow-up questions targeting identified gaps (3-5 at a time)
3. Refine understanding with each round
4. Maximum 3 rounds of questions before generating the PRD draft

## When to Stop Asking

Stop asking clarifying questions and proceed to PRD generation when:

- Core functionality is well-defined
- User stories are clear and complete
- Technical constraints and dependencies are understood
- Non-goals are established
- The user explicitly indicates they are ready to proceed

## Priority Inference After Questions

After gathering all clarifying answers, infer priorities for each functional requirement:

| Priority | Level    | Keyword Triggers                              | Examples                               |
| -------- | -------- | --------------------------------------------- | -------------------------------------- |
| P0       | Critical | critical, blocking, security, must-have, core | "User authentication is critical"      |
| P1       | High     | urgent, important, primary, main, key         | "Main feature for Q1 release"          |
| P2       | Normal   | should, standard, typical, expected (default) | "Users should be able to upload files" |
| P3       | Low      | nice-to-have, optional, could, enhancement    | "Could add dark mode later"            |
| P4       | Lowest   | eventually, backlog, maybe, stretch           | "Maybe add advanced search"            |

**Inference process:**
1. Analyze requirement text for keyword presence
2. Consider context and emphasis (e.g., "CRITICAL" vs "critical")
3. Check for negation patterns (e.g., "not critical")
4. Assign confidence based on keyword strength and context
5. When multiple keywords exist, use highest priority match

**Confidence levels:**
- **High**: Explicit keyword with clear context
- **Medium**: Implicit priority from domain context or user emphasis
- **Low**: No clear indicators, using default P2

**Confirmation workflow:**
1. Present inferred priorities in table format
2. Use `AskUserQuestion`: accept all, adjust individually, or redo inference
3. Store confirmed priorities in frontmatter `priorities.requirements`
