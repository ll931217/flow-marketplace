---
name: project-setup
description: Use when setting up project-specific knowledge in semantic memory. Captures architecture, technologies, and conventions for the current project.
---

# Project Setup Skill

This skill captures project-specific knowledge to help the agent understand the current project's architecture and conventions.

## Usage

```
/memory:project-setup
```

## Process

### 1. Detect Project Context

First, gather automatic information:
- Project name from directory
- Check for package.json, pyproject.toml, go.mod, etc.
- Identify primary language
- Check for existing documentation

### 2. Welcome & Overview

```
Project Setup: <project_name>

I'll help you capture project-specific knowledge for better context.
This helps me understand your project's architecture and conventions.

Detected:
- Language: TypeScript
- Package Manager: npm
- Framework: Express.js

Let me ask a few questions to capture more details.
```

### 3. Project Architecture

```
What's the project architecture?

Options:
1. Monolith
2. Microservices
3. Serverless
4. Plugin-based
5. Monorepo
6. Other / Skip

> _
```

Store in dataset `{project_name}` with tags: `architecture`

### 4. Main Technologies

```
What are the main technologies/frameworks used?

Examples: Express, Fastify, Next.js, React, Vue, Django, FastAPI

> _
```

Store with tags: `technologies`

### 5. Database

```
What database(s) does this project use?

Options:
1. PostgreSQL
2. MySQL
3. MongoDB
4. SQLite
5. Redis
6. Multiple
7. None / Skip

> _
```

If multiple, ask for details. Store with tags: `database`

### 6. API Pattern

```
What API pattern does this project use?

Options:
1. REST
2. GraphQL
3. tRPC
4. gRPC
5. Mixed
6. None / Skip

> _
```

Store with tags: `api`

### 7. Build Tools

```
What build tools/bundlers are used?

Options:
1. Webpack
2. Vite
3. esbuild
4. Rollup
5. Turbo
6. Other / Skip

> _
```

Store with tags: `build`

### 8. Deployment Target

```
Where is this project deployed?

Options:
1. Vercel
2. AWS
3. GCP
4. Azure
5. Docker/Kubernetes
6. Self-hosted
7. Not yet / Skip

> _
```

Store with tags: `deployment`

### 9. Key Dependencies

```
List any key dependencies or libraries that are central to this project:

Examples: zod for validation, prisma for ORM, trpc for API

> _
```

Store with tags: `dependencies`

### 10. Coding Conventions

```
Any specific coding conventions for this project?

Examples:
- Use functional programming style
- Prefer composition over inheritance
- Always use named exports

> _
```

Store with tags: `conventions`

### 11. Summary & Confirmation

```
## Project Knowledge Summary

Project: <project_name>

- Architecture: Plugin-based
- Technologies: Express, TypeScript
- Database: PostgreSQL with pgvector
- API Pattern: REST
- Build: TypeScript compiler
- Deployment: Self-hosted
- Key Dependencies: MCP SDK, pg
- Conventions: Functional style, immutable patterns

Save this project knowledge? [Y/n]
```

### 12. Save to Memory

For each item, call `memory_add`:

```json
{
  "name": "memory_add",
  "arguments": {
    "dataset": "<project_name>",
    "content": "Architecture: Plugin-based system with commands/skills/hooks",
    "tags": ["architecture"]
  }
}
```

## Completion Message

```
Project knowledge saved for <project_name>!

I'll use this context when working on this project.
Update anytime with /memory:project-setup
```
