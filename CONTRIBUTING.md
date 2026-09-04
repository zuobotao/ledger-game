# Contributing to Ledger

Thank you for your interest in contributing to Ledger! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by respectful and constructive behavior. Be kind, be respectful, and focus on what is best for the community and the educational mission of the project.

## How to Contribute

### Reporting Issues

- Use the GitHub Issue tracker to report bugs or suggest features
- Provide clear, reproducible steps for bug reports
- Include your browser and OS information
- Include screenshots if relevant

### Submitting Changes

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Add or update tests as appropriate
5. Ensure all tests pass: `npm run test`
6. Ensure type checking passes: `npm run type-check`
7. Ensure linting passes: `npm run lint`
8. Submit a pull request

### Pull Request Guidelines

- **Title:** Clear, concise summary of the change
- **Description:** Explain what changed and why
- **Scope:** Keep PRs focused on a single change. Split large changes into multiple PRs
- **Tests:** Add tests for new functionality
- **Documentation:** Update documentation as needed

## Legal Requirements for Contributors

### License

This project is licensed under the Apache License, Version 2.0. By contributing, you agree that your contributions will be licensed under the same license.

### DCO (Developer Certificate of Origin)

By submitting a contribution, you certify that:

1. The contribution was created in whole or in part by you and you have the right to submit it under the Apache 2.0 license
2. The contribution is based upon previous work that, to the best of your knowledge, is covered under an appropriate open source license
3. You have not been asked to, nor have you agreed to, assign your copyright to anyone for this contribution

### No Third-Party IP Submission

Do NOT submit content that:

- Infringes on third-party copyrights, trademarks, or patents
- Copies game mechanics, card text, or assets from proprietary board games
- Uses trademarked names that could cause confusion
- Includes content you don't have the right to contribute

### AI-Generated Contributions

If you use AI tools (e.g., LLMs, code generators) to create contributions:

1. You are responsible for ensuring the output is original and doesn't infringe third-party rights
2. Do not paste proprietary or copyrighted code into AI prompts
3. Review and test all AI-generated code before submission
4. Disclose AI usage in your pull request description

See `docs/legal/AI_CONTRIBUTION_POLICY.md` for full details.

### Card and Content Contributions

When contributing game cards, scenarios, or narrative content:

- Use original names and descriptions
- Do not copy from existing board games or financial products
- Use fictional stock symbols and company names
- Ensure educational content is factual but framed as simulation
- Do not include real company tickers or financial advice

See `docs/legal/CARD_PROVENANCE.md` for card content guidelines.

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run type checking
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## Project Structure

```
src/
  components/    # Vue components
  views/         # Page-level views
  stores/        # Pinia state stores
  utils/         # Utility functions
  types/         # TypeScript type definitions
  assets/        # Static assets
  router/        # Vue Router configuration
docs/
  legal/         # Legal and compliance documentation
  releases/      # Release notes
```

## Questions?

If you have questions about contributing, feel free to open a GitHub Issue.
