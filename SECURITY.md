# Security Policy

## Supported Versions

Only the latest active development release receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| v0.1.x  | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

We take the security of SkillSync AI very seriously.

If you discover a security vulnerability, please do **NOT** open a public GitHub issue. Instead, disclose it responsibly by contacting the maintainers directly or emailing security contact details provided in the repository profile.

### What to Include:
- A clear description of the issue
- Steps to reproduce or a Proof of Concept (PoC)
- Potential impact of the vulnerability
- Any suggested remediations

Maintainers will respond within 48 hours to acknowledge receipt and coordinate a fix and advisory.

## Security Practices
- Never commit credentials, private keys, or production connection strings to version control.
- Use `.env.example` as a template and keep real environment files git-ignored.
- All dependencies are regularly scanned using automated dependency auditing tools.
