# Random long-game turn limit

## Finding

The random single-player playtest reaching turn 51 is a harness limit, not a game victory or a product deadlock. The run is still in `rat_race` with an idle turn. At one turn per month, a 50-turn run has advanced only about 50 months; the configured retirement threshold is 480 months (age 25 to 65).

The product can finish a single-player game by buying a dream in the fast track or by reaching the configured retirement age. A random bot is not guaranteed to reach financial freedom and enter the fast track within 50 turns, so this scenario can legitimately remain active when the harness cap is reached.

## Reporting rule

`BaseBot` now reports an `ActionGuard` `max-turns` stop as `test-limit`. Reports count it separately and exclude it from `completedGames`; `completed`, `victory`, and `game-over` remain product terminal states. This keeps a bounded stability run useful without presenting the test cap as a completed game.

The 50-turn cap remains a safety limit for UI automation. Longer natural gameplay coverage should use a larger explicit `--max-turns` value or a strategy fixture that is designed to reach the fast track.
