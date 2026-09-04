# AI Contribution Policy

**Last Updated:** 2026-09-04
**Version:** v2.0

This document defines the policies and guidelines for using AI tools when contributing code, documentation, or other content to Ledger.

---

## 1. Overview

AI tools (such as GitHub Copilot, ChatGPT, Claude, CodeLlama, etc.) can be used as productivity aids for contributing to Ledger. However, contributors are fully responsible for all content they submit, regardless of whether AI tools were used.

---

## 2. What AI Can Do

AI tools may be used for:

- ✅ Generating boilerplate code
- ✅ Refactoring suggestions
- ✅ Writing test cases
- ✅ Writing documentation drafts
- ✅ Debugging assistance
- ✅ Code review suggestions
- ✅ Translating documentation
- ✅ Explaining concepts or code patterns

---

## 3. What You Must Do

When using AI tools, you MUST:

### 3.1 Take Full Responsibility

You are the author of record for any contribution you submit. You are responsible for:
- Every line of code
- Every bug introduced
- Every license implication
- The correctness and safety of the contribution

AI is a tool — you are the craftsperson.

### 3.2 Review Everything

You must thoroughly review and understand:
- All AI-generated code before submitting
- All AI-generated documentation before submitting
- The logic, edge cases, and potential issues

Do not blindly copy-paste AI output and submit it.

### 3.3 Verify Origin

Ensure AI-generated content does not:
- Copy code from proprietary sources
- Reproduce code from incompatible-license projects
- Include API keys, credentials, or personal data
- Reproduce copyrighted text verbatim

If you're unsure about the source of AI-generated code, don't use it.

### 3.4 Test Thoroughly

AI-generated code must be tested to the same standard as human-written code:
- Unit tests must pass
- The feature must work correctly
- Edge cases must be handled
- Linting and type checking must pass

---

## 4. What You Must NOT Do

### 4.1 Don't Copy Third-Party Code

AI models sometimes reproduce code from their training data. Do NOT submit AI-generated code that:

- Appears to be copied from Stack Overflow (unless properly attributed and licensed)
- Matches code from GPL/AGPL projects
- Contains third-party copyright headers or comments
- Reproduces proprietary or trade-secret code

### 4.2 Don't Introduce Unknown Licenses

If AI generates code that includes license headers or references to specific projects, verify the license is compatible with Apache-2.0 before using it.

When in doubt:
1. Rewrite the code yourself
2. Don't use the AI output
3. Ask the project maintainers

### 4.3 Don't Submit Secrets

AI tools may occasionally generate fake or placeholder API keys, passwords, or tokens. Never commit real credentials. Use placeholder values in example files.

### 4.4 Don't Generate Unvetted Assets

AI-generated images, audio, or other media assets:
- Must comply with the AI platform's terms of service for commercial use
- Must not reproduce copyrighted characters, logos, or designs
- Must be listed in `docs/legal/ASSET_LICENSES.md` with AI generation noted
- Should be reviewed for trademark and copyright risks

---

## 5. Disclosure

You are not required to disclose that you used AI tools for a contribution. The quality and originality of the contribution are what matter.

However, if you're unsure whether an AI-generated snippet might have licensing issues, please mention it in your PR description so maintainers can help review it.

---

## 6. AI-Generated Content Categories

### Code
- Allowed with human review and testing
- Contributor is fully responsible
- Must pass all existing quality checks

### Documentation
- Allowed with human review
- Must be factually accurate
- Must match the project's style and tone

### Game Content (Cards, Stories, Text)
- Allowed with human review and editing
- Must be original expression, not copied from existing works
- Must not reference real companies or trademarks inappropriately
- Must comply with the game's fictional universe guidelines

### Visual Assets (Images, SVG, Icons)
- Allowed only if the AI platform's TOS permits commercial use
- Must be reviewed for trademark/copyright issues
- Must be added to `docs/legal/ASSET_LICENSES.md`

### Audio
- Allowed only if the AI platform's TOS permits commercial use
- Must be added to `docs/legal/ASSET_LICENSES.md`

---

## 7. Maintainer Review

Maintainers reviewing PRs that use AI tools should:
1. Focus on code quality, not whether AI was used
2. Check for potential license or plagiarism issues like any other PR
3. Reject code that doesn't meet quality standards, regardless of origin
4. Ask for clarification if something looks suspicious

The standard for acceptance is the same whether code was written by a human, an AI, or a collaboration between them.

---

## 8. Policy Rationale

This policy is intentionally pragmatic:

- **AI tools are here to stay** — banning them is impractical and counterproductive
- **Quality is what matters** — good code is good code, regardless of origin
- **Accountability is key** — the human contributor is always responsible
- **Legal risks are real** — AI can reproduce licensed code, so vigilance is required

---

## 9. Future Changes

This policy may be updated as:
- AI technology evolves
- Legal precedents emerge
- Project needs change

Significant changes will be announced in release notes.
