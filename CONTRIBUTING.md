# Contributing to SkillSync AI

Thank you for contributing to **SkillSync AI**, an open-source, AI-powered skill development and employment ecosystem.

## 1. Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and collaborative.

## 2. Git Workflow & Branching Strategy

We follow a structured branching model:

```text
main           (Production / Release-ready code)
  ↑
develop        (Integration branch)
  ↑
feature/*      (New features and modules)
bugfix/*       (Bug fixes)
chore/*        (Maintenance, tooling, and documentation)
```

### Branching Rules
- **Never push directly to `main` or `develop`**.
- Create feature branches off `develop`:
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feature/<feature-name>
  ```
- Before creating a Pull Request (PR), ensure all tests and linters pass locally.
- Rebase or merge latest `develop` into your feature branch before submitting a PR.

## 3. Commit Message Convention

We follow conventional commit guidelines:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code (white-space, formatting)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools and libraries

Example:
```bash
git commit -m "feat: add pgvector embedding abstraction"
```

## 4. Local Development Standards

- **Backend**:
  - Python 3.12+ (tested up to 3.14)
  - Code formatting and linting: `ruff check .`
  - Unit & integration tests: `pytest`
- **Frontend**:
  - Node.js 18+ (tested on Node 22)
  - Code linting: `npm run lint`
  - Type validation: `npx tsc --noEmit`
  - Build validation: `npm run build`
- **Zero Paid Dependencies**:
  - Do not introduce proprietary APIs (OpenAI, Gemini, Claude, proprietary clouds).
  - All AI components must support local deployment (Ollama, local Hugging Face / Sentence Transformers).

## 5. Pull Request Checklist

Before submitting your PR:
- [ ] Code follows project style conventions.
- [ ] All automated tests pass (`pytest` for backend, `npm test` for frontend).
- [ ] Linters pass with zero warnings (`ruff`, `eslint`).
- [ ] Documentation has been updated (under `docs/` and `README.md`).
- [ ] No secrets, keys, or credentials committed.
