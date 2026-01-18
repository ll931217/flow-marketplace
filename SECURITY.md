# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

### Private Disclosure Process

If you discover a security vulnerability, please **do not open a public issue**. Instead, follow these steps:

1. **Send an email** to: security@flow.dev
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

### What to Expect

- We will acknowledge receipt within 48 hours
- We will provide a detailed response within 7 days
- We will work with you on a fix timeline
- You will be credited in the security advisory (unless you wish to remain anonymous)

### Disclosure Timeline

We aim to:
1. Confirm vulnerability within 48 hours
2. Develop fix within 7-14 days
3. Release fix within 30 days (depending on severity)
4. Publish security advisory after fix is available

## Security Best Practices

### For Users

**Flow Plugin:**
- Review PRD content before execution
- Be cautious with autonomous mode on untrusted projects
- Keep beads/worktrunk updated if using

**Semantic Memory Plugin:**
- Use strong database credentials
- Restrict database access to localhost
- Use environment variables for sensitive data
- Regularly update dependencies
- Review indexed content before deployment

### Database Security (Semantic Memory)

```bash
# Create dedicated database user with limited permissions
psql -c "CREATE USER semantic_memory WITH PASSWORD 'secure-password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE semantic_memory TO semantic_memory;"

# Use connection SSL
export DATABASE_URL="postgresql://semantic_memory:password@localhost/semantic_memory?sslmode=require"
```

### Environment Variables

Never commit sensitive data:

```bash
# .env (add to .gitignore)
DATABASE_URL="postgresql://user:pass@localhost/db"
OPENAI_API_KEY="sk-..."
```

## Dependency Security

### Automated Scans

- npm audit runs automatically on CI/CD
- Dependabot alerts enabled
- GitHub Actions security scanning

### Updating Dependencies

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Manual update
npm update
```

## Security-Related Features

### Input Validation

**Flow Plugin:**
- PRD content is validated before processing
- File paths are sanitized before operations
- Command injection protection on all inputs

**Semantic Memory Plugin:**
- SQL query parameterization
- Path traversal protection
- File type validation for indexing

### Data Privacy

**Semantic Memory Plugin:**
- No data leaves your local environment
- Embeddings generated locally (no external API calls)
- Project isolation prevents cross-project data access
- Clear data retention policies

### Access Control

**MCP Server:**
- Stdio communication only (no network exposure)
- Database connections require explicit credentials
- No remote code execution capabilities

## Vulnerability Types We Track

- **Critical**: Remote code execution, data exfiltration
- **High**: Privilege escalation, SQL injection, XSS
- **Medium**: DoS, authentication bypass
- **Low**: Information disclosure, minor logic errors

## Security Audits

Professional security audits are welcomed. Contact us at:
- Email: security@flow.dev
- GitHub: @flow-community

## Policy Compliance

This project follows:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

## Receiving Security Updates

1. Watch the repository for releases
2. Monitor [Security Advisories](https://github.com/flow-community/flow-marketplace/security/advisories)
3. Subscribe to the [flow-dev mailing list](https://groups.google.com/g/flow-dev)

## Security Contact

- **Email**: security@flow.dev
- **PGP Key**: Available on [keyserver.ubuntu.com](https://keyserver.ubuntu.com/pks/lookup?search=security%40flow.dev)
- **GitHub Security Advisory**: [flow-community/flow-marketplace](https://github.com/flow-community/flow-marketplace/security/advisories)

Thank you for helping keep Flow Marketplace secure!
