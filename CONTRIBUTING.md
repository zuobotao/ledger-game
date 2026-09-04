# Contributing to Ledger

Thank you for your interest in contributing to Ledger! This document outlines the contribution process and legal requirements.

---

## Code of Conduct

By participating in this project, you agree to:
- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for your contributions
- Respect differing viewpoints and experiences

---

## How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs or suggest features
- Include steps to reproduce for bug reports
- Specify your browser and operating system

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test`)
5. Run lint (`npm run lint`)
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Commit Convention
We follow Conventional Commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `test:` Adding or updating tests
- `chore:` Changes to build process or tools

---

## Legal Requirements for Contributors

### 1. Copyright Ownership

By submitting a contribution, you represent and warrant that:

- You own the copyright to your contribution, or
- You have the legal right to submit the contribution on behalf of the copyright owner

### 2. License Grant

By submitting a contribution, you agree to license your work under the same license as the project: **Apache License, Version 2.0**.

This means:
- Your contributions can be used, modified, and distributed freely
- You grant a patent license for any patents embodied in your contribution
- You do not retain exclusive rights to your contribution

### 3. Third-Party Code

**Do NOT submit third-party code unless:**

- The code is clearly labeled as third-party
- The license is compatible with Apache-2.0 (MIT, BSD, ISC, Apache, etc.)
- You add appropriate attribution to `THIRD_PARTY_NOTICES.md`
- The code is in a clearly marked location (e.g., `vendor/` directory)

**Prohibited licenses — code under these licenses cannot be merged:**
- GPL (any version)
- AGPL (any version)
- LGPL (any version)
- SSPL
- BSL / "source available" non-open licenses
- Any unknown / unidentifiable license

If you're unsure whether a dependency's license is compatible, ask before submitting.

### 4. Third-Party Assets

**Do NOT submit images, fonts, audio, or other media assets unless:**

- You created them yourself (original work)
- They are from a source with a clearly verifiable license (CC0, CC-BY, OFL, etc.)
- You add attribution to `docs/legal/ASSET_LICENSES.md`
- You can prove the source and license

**Prohibited asset sources:**
- Google Images / Pinterest / social media (unknown license)
- Assets extracted from other games or software
- AI-generated images without confirming platform TOS for commercial use
- "Free" websites with unclear licensing
- Assets where you cannot identify the original creator

### 5. AI-Generated Code

AI-generated code contributions are allowed, but you must:

1. Take full responsibility for the code as if you wrote it yourself
2. Review and understand every line of AI-generated code
3. Ensure the code doesn't copy from proprietary sources
4. Verify the code works correctly before submitting
5. Do not pass off AI-generated code as entirely your own work in a misleading way

See `docs/legal/AI_CONTRIBUTION_POLICY.md` for full details.

### 6. No Secrets

**Never commit:**
- API keys
- Passwords
- Private keys
- Tokens
- Personal information
- Configuration with real credentials

Use `.env.example` files with placeholder values. Real credentials go in `.env` files which are gitignored.

---

## Adding New Dependencies

Before adding a new npm dependency, consider:

1. Is it necessary? Can you implement the feature without it?
2. What is its license? (Must be compatible with Apache-2.0)
3. Is it actively maintained?
4. Does it have a large user base?
5. What is its security track record?

Add the dependency to `THIRD_PARTY_NOTICES.md` with its license information.

---

## Legal Checklist for Pull Requests

Before submitting a PR, verify:

- [ ] My contribution is original work or properly attributed
- [ ] I have the right to submit this contribution
- [ ] No third-party code with incompatible licenses
- [ ] No third-party assets without verified license
- [ ] No secrets or credentials in the code
- [ ] No personal information (PII)
- [ ] No references to real companies/brands that could cause trademark issues
- [ ] All new assets are listed in `docs/legal/ASSET_LICENSES.md`
- [ ] All new dependencies are listed in `THIRD_PARTY_NOTICES.md`
- [ ] Tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)

---

## Questions?

If you have questions about contributing or legal requirements, please open an issue on GitHub.

---

## Acknowledgments

By contributing to Ledger, you're helping build an open financial education tool.
Thank you for your time and effort!
