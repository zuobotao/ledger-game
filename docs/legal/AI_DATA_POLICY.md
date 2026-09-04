# AI Data Policy

**Last Updated:** 2026-09-04
**Version:** v2.0

This document defines the data boundaries and safety policies for AI-powered features in Ledger.

---

## 1. Core Principle

> AI features in Ledger operate exclusively on game state data. No real personal or financial data is ever sent to AI systems.

---

## 2. Current State

As of v2.0, all AI logic in Ledger runs **locally in the browser** using deterministic algorithms. No external AI APIs are called.

Current AI features:
- AI opponent decision-making (deterministic heuristics)
- Learning mode strategy hints (rule-based analysis)

These features:
- Run entirely on the client side
- Do not make network requests
- Do not collect or transmit any data
- Use only the game's internal state

---

## 3. Future AI Integration Policy

If Ledger adds external AI API integration in future versions, the following policies **must** be followed:

### 3.1 Allowed Data

Only the following types of data may be sent to AI providers:

| Category | Allowed | Examples |
|----------|---------|----------|
| Fictional game state | ✅ Yes | Player cash, assets, position — all fictional game data |
| Game actions | ✅ Yes | "Buy stock", "Take loan" — game-specific actions |
| Simulation results | ✅ Yes | Projected net worth, cash flow changes — simulated outcomes |
| Card data | ✅ Yes | Card names, descriptions, values — all original/fictional content |
| Game configuration | ✅ Yes | Number of players, difficulty, game rules |

### 3.2 Forbidden Data

The following types of data must **never** be sent to AI providers:

| Category | Forbidden | Why |
|----------|-----------|-----|
| Real bank information | ❌ Never | Privacy, security, regulatory risk |
| Real brokerage information | ❌ Never | Financial privacy, regulatory risk |
| Payment information | ❌ Never | Security risk |
| Real personal information | ❌ Never | Privacy risk |
| Real financial portfolio data | ❌ Never | Investment advice regulation risk |
| User's real name | ❌ Never | Privacy risk |
| User's email or phone | ❌ Never | Privacy risk |
| Location data | ❌ Never | Privacy risk |
| Identity documents | ❌ Never | Privacy, legal risk |
| Unnecessary personal data | ❌ Never | Data minimization principle |

### 3.3 Implementation Requirements

If external AI is added:

1. **Clear opt-in**: Users must explicitly enable AI features. Disabled by default.
2. **Transparency**: Users must be told what data is sent, where it goes, and why.
3. **Data minimization**: Send only the minimum data needed for the feature.
4. **No real data validation**: Code-level validation that no real-world financial data fields are included in AI requests.
5. **Privacy policy update**: Privacy Policy must be updated before launching any external AI feature.
6. **Terms update**: Terms of Use must be updated to cover AI features.

---

## 4. AI Output Boundaries

### 4.1 What AI May Do

- Compare different game strategies within the simulation
- Explain financial concepts in educational context
- Analyze game state and suggest in-game decision factors
- Provide historical or conceptual financial education
- Calculate and present simulation results
- Explain why certain game mechanics work the way they do

### 4.2 What AI Must NEVER Do

- ❌ Provide personalized investment advice for real securities
- ❌ Recommend buying, selling, or holding real stocks or assets
- ❌ Claim that simulated results predict real market performance
- ❌ Present game strategies as applicable to real-world investing without clear disclaimer
- ❌ Use language that implies financial expertise or certification
- ❌ Refer to real companies, tickers, or financial products (unless in an educational/historical context)
- ❌ Make guarantees about financial outcomes
- ❌ Act as a financial advisor or planner

### 4.3 Required Disclaimers

All AI output must be accompanied by clear disclaimers:

> **This is a game simulation analysis, not investment advice.**
>
> All data shown is fictional. Results do not represent real investment performance.
> Do not make real-world financial decisions based on this information.

---

## 5. Financial Advice Boundary

Ledger's AI features are designed to cross the line into **"simulation analysis"** but never into **"personalized investment advice."**

### Safe Zone (Simulation Analysis)
```
✓ "In this game scenario, Strategy A yields higher simulated passive income."
✓ "Based on the game's financial model, this investment has a 5% monthly ROI."
✓ "Comparing the three options, Strategy B reaches the goal fastest in simulation."
✓ "Here are the pros and cons of each choice within the game's rules."
```

### Danger Zone (Investment Advice — Never)
```
✗ "You should invest in real estate."
✗ "This stock is a good buy right now."
✗ "I recommend putting 80% of your money into stocks."
✗ "This is a low-risk, high-return opportunity."
✗ "You should sell your holdings."
```

### Key Distinction

| Factor | Safe (Game) | Unsafe (Real World) |
|--------|-------------|---------------------|
| Context | Clearly within game simulation | References real financial markets |
| Data | Fictional game data | Real personal financial data |
| Recommendation | "In this game, X strategy works" | "You should do X with your money" |
| Disclaimer | Clear and prominent | Missing or buried |

---

## 6. Development Guidelines

When implementing or modifying AI features:

1. **Always add disclaimers** to any AI output surface
2. **Use fictional examples** — never reference real companies or tickers
3. **Focus on education**, not recommendation
4. **Present options**, not directives — show comparisons and trade-offs
5. **Emphasize simulation nature** of all analysis
6. **Avoid authority language** — don't use "expert", "advisor", "professional"
7. **Test for ambiguity** — if a reasonable user could think this is real advice, rewrite it

---

## 7. Compliance Checks

Before releasing any AI feature:

- [ ] No real personal data is sent to AI providers
- [ ] All AI output includes clear disclaimer
- [ ] No investment advice language ("you should buy", "recommend", etc.)
- [ ] No real stock tickers or company names in AI prompts
- [ ] Privacy Policy updated to cover AI data practices
- [ ] Terms of Use updated
- [ ] Users can opt out of AI features
- [ ] AI provider's privacy policy reviewed
