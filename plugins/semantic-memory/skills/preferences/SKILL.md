---
name: preferences
description: Use when setting up or updating user coding preferences. Guides user through interactive preference capture for libraries, patterns, and coding style.
---

# User Preferences Setup Skill

This skill guides users through setting up their coding preferences in semantic memory.

## Usage

```
/memory:preferences
```

## Process

### 1. Welcome & Explanation

```
Welcome to Preference Setup!

I'll ask you about your coding preferences to personalize your development experience.
These preferences will be remembered across sessions and projects.

You can skip any question by pressing Enter.
```

### 2. Programming Languages

```
What are your primary programming languages? (comma-separated)
Examples: TypeScript, Python, Go, Rust

> _
```

Store in dataset `user` with tags: `languages`

### 3. State Management (Frontend)

```
For frontend development, what's your preferred state management approach?

Options:
1. Redux (with Toolkit)
2. Zustand
3. React Context
4. MobX
5. Other / Skip

> _
```

Store with tags: `frontend, state`

### 4. Testing Framework

```
What testing framework do you prefer?

Options:
1. Jest
2. Vitest
3. Pytest (Python)
4. Go testing
5. Other / Skip

> _
```

Store with tags: `testing`

### 5. Component Style

```
For React/frontend, what component style do you prefer?

Options:
1. Functional components with hooks
2. Class components
3. Skip

> _
```

Store with tags: `frontend, components`

### 6. Styling Approach

```
What's your preferred CSS/styling approach?

Options:
1. Tailwind CSS
2. CSS Modules
3. Styled Components
4. Emotion
5. Plain CSS
6. Skip

> _
```

Store with tags: `frontend, styling`

### 7. Error Handling

```
How do you prefer to handle errors?

Options:
1. Try-catch with custom error classes
2. Result/Either pattern
3. Global error handlers
4. Skip

> _
```

Store with tags: `patterns, error-handling`

### 8. Code Organization

```
How do you prefer to organize code?

Options:
1. Feature-based folders
2. Type-based folders (components/, utils/, etc.)
3. Domain-driven design
4. Skip

> _
```

Store with tags: `patterns, organization`

### 9. Documentation

```
What's your documentation preference?

Options:
1. JSDoc/TSDoc comments
2. Inline comments only
3. External documentation
4. Minimal documentation
5. Skip

> _
```

Store with tags: `documentation`

### 10. Git Workflow

```
What's your preferred Git workflow?

Options:
1. GitFlow
2. GitHub Flow (feature branches + PR)
3. Trunk-based development
4. Skip

> _
```

Store with tags: `git, workflow`

### 11. Summary & Confirmation

```
## Preferences Summary

I've captured the following preferences:

- Languages: TypeScript, Python
- State Management: Zustand
- Testing: Vitest
- Component Style: Functional components with hooks
- Styling: Tailwind CSS
- Error Handling: Try-catch with custom error classes
- Code Organization: Feature-based folders
- Documentation: JSDoc/TSDoc comments
- Git Workflow: GitHub Flow

Save these preferences? [Y/n]
```

### 12. Save to Memory

For each preference, call `memory_add`:

```json
{
  "name": "memory_add",
  "arguments": {
    "dataset": "user",
    "content": "Preferred state management: Zustand",
    "tags": ["frontend", "state"]
  }
}
```

## Completion Message

```
Preferences saved! I'll remember these across sessions.

You can update preferences anytime with /memory:preferences
Or add individual preferences with /memory:learn
```
