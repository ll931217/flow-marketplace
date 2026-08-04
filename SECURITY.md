# Security Policy

## Supported Versions

Only the latest released version of each plugin receives security fixes.

| Plugin          | Supported          |
|-----------------|--------------------|
| flow 2.x        | :white_check_mark: |
| semantic-memory 2.x | :white_check_mark: |
| anything older  | :x:                |

## Reporting a Vulnerability

Please **do not open a public issue** for security problems. Instead, report
privately via [GitHub Security Advisories](https://github.com/ll931217/flow-marketplace/security/advisories/new)
with a description, reproduction steps, and impact.

This is a single-maintainer project - reports are handled on a best-effort
basis, and you will be credited in the fix unless you prefer otherwise.

## Security Best Practices

### For Users

**Flow Plugin:**
- Review PRD content before execution
- Be cautious with autonomous mode on untrusted projects
- Keep beads/worktrunk updated if using

**Semantic Memory Plugin:**
- Use strong database credentials; restrict database access to localhost
- Use environment variables for sensitive data - never commit `.env`
- Regularly update dependencies (`npm audit` / dependabot PRs)

### Database Security (Semantic Memory)

```bash
# Create dedicated database user with limited permissions
psql -c "CREATE USER semantic_memory WITH PASSWORD 'secure-password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE semantic_memory TO semantic_memory;"

# Use connection SSL
export DATABASE_URL="postgresql://semantic_memory:password@localhost/semantic_memory?sslmode=require"
```

### Access Control

**MCP Server:**
- Stdio communication only (no network exposure)
- Database connections require explicit credentials
