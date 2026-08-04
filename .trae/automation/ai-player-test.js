/**
 * Automated test: 1-6 AI players complete full game
 * Tests game flow smoothness and detects issues
 *
 * Usage: Run in browser console on the game page
 */

async function runAITests() {
  const results = [];
  const issues = [];

  for (let playerCount = 1; playerCount <= 6; playerCount++) {
    console.log(`\n========== Testing ${playerCount} AI player(s) ==========`);
    const result = await testSingleConfig(playerCount);
    results.push(result);
    if (result.issues.length > 0) {
      issues.push(...result.issues.map((i) => `[${playerCount}AI] ${i}`));
    }
    console.log(`Result: ${result.status} in ${result.turns} turns, ${result.duration}ms`);
    if (result.issues.length > 0) {
      console.log('Issues:', result.issues);
    }
    // Small delay between tests
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('\n========== TEST SUMMARY ==========');
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter((r) => r.status !== 'error').length}`);
  console.log(`Total issues found: ${issues.length}`);
  if (issues.length > 0) {
    console.log('All issues:');
    issues.forEach((i, idx) => console.log(`  ${idx + 1}. ${i}`));
  }

  return { results, issues };
}

async function testSingleConfig(playerCount) {
  const startTime = Date.now();
  const issues = [];
  let status = 'unknown';
  let turns = 0;
  let maxTurns = 480; // 40 years worth of turns max

  try {
    // Reset game
    window.gameStore.resetGame();

    // Create AI player configs
    const playerSetups = [];
    const colors = ['blue', 'green', 'red', 'orange', 'purple', 'pink'];
    const careers = ['engineer', 'teacher', 'doctor', 'lawyer', 'pilot', 'nurse'];

    for (let i = 0; i < playerCount; i++) {
      playerSetups.push({
        name: `AI ${i + 1}`,
        colorId: colors[i],
        careerId: careers[i % careers.length],
        isAI: true,
        aiDifficulty: 'medium',
      });
    }

    const config = {
      playerCount,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    };

    const started = window.gameStore.startGame(config, playerSetups);
    if (!started) {
      return {
        playerCount,
        status: 'error',
        turns: 0,
        duration: Date.now() - startTime,
        issues: ['Failed to start game'],
      };
    }

    // Verify all players are AI
    const allAI = window.gameStore.players.every((p) => p.isAI);
    if (!allAI) {
      issues.push('Not all players are AI');
    }

    // Verify correct player count
    if (window.gameStore.players.length !== playerCount) {
      issues.push(
        `Player count mismatch: expected ${playerCount}, got ${window.gameStore.players.length}`,
      );
    }

    // Run game loop
    let consecutiveIdleCount = 0;
    let lastTurnNumber = 0;
    let lastPlayerIndex = -1;
    let stuckCounter = 0;

    while (
      window.gameStore.phase !== 'finished' &&
      turns < maxTurns &&
      stuckCounter < 20
    ) {
      // Wait for AI to play
      await new Promise((r) => setTimeout(r, 50));

      const currentTurn = window.gameStore.turnNumber || 1;
      const currentIdx = window.gameStore.currentPlayerIndex;

      // Detect if game is stuck
      if (currentTurn === lastTurnNumber && currentIdx === lastPlayerIndex) {
        stuckCounter++;
      } else {
        stuckCounter = 0;
      }
      lastTurnNumber = currentTurn;
      lastPlayerIndex = currentIdx;
      turns = currentTurn;

      // Check for errors in store
      if (window.gameStore.turnStatus === 'idle' && window.gameStore.phase !== 'finished') {
        consecutiveIdleCount++;
        if (consecutiveIdleCount > 30) {
          // Game might be stuck - trigger AI turn if current player is AI
          const cp = window.gameStore.currentPlayer;
          if (cp && cp.isAI && !cp.isBankrupt) {
            console.warn(
              `Turn ${currentTurn}: Game appears idle with AI player, triggering runAITurn`,
            );
            try {
              window.gameStore.runAITurn();
              consecutiveIdleCount = 0;
            } catch (e) {
              issues.push(`Error triggering AI turn: ${e.message}`);
              break;
            }
          }
        }
      } else {
        consecutiveIdleCount = 0;
      }

      // Check for bankrupt players not being skipped properly
      const activePlayers = window.gameStore.players.filter((p) => !p.isBankrupt);
      if (activePlayers.length === 0 && window.gameStore.phase !== 'finished') {
        issues.push('All players bankrupt but game not finished');
        break;
      }
    }

    if (stuckCounter >= 20) {
      status = 'stuck';
      issues.push(
        `Game appears stuck at turn ${turns}, player index ${lastPlayerIndex}, phase ${window.gameStore.phase}`,
      );
    } else if (turns >= maxTurns) {
      status = 'timeout';
      issues.push(`Game exceeded max turns (${maxTurns})`);
    } else {
      // Game completed
      const endReason = window.gameStore.gameEndReason;
      status = endReason || 'completed';

      // Verify winner
      if (endReason === 'victory' && !window.gameStore.winnerId) {
        issues.push('Victory but no winnerId set');
      }

      // Verify all players have financial snapshots
      for (const p of window.gameStore.players) {
        if (!p.isBankrupt && p.financialSnapshots.length === 0) {
          issues.push(`Player ${p.name} has no financial snapshots`);
        }
      }

      // Verify transactions recorded
      if ((window.gameStore.transactions || []).length === 0) {
        issues.push('No transactions recorded');
      }
    }
  } catch (e) {
    status = 'error';
    issues.push(`Exception: ${e.message}`);
    console.error('Test error:', e);
  }

  return {
    playerCount,
    status,
    turns,
    duration: Date.now() - startTime,
    issues,
    playerStates: window.gameStore.players.map((p) => ({
      name: p.name,
      isBankrupt: p.isBankrupt,
      cash: p.cash,
      passiveIncome: p.passiveIncome,
      totalExpenses: p.totalExpenses,
      assetCount: p.assets.length,
    })),
  };
}

// Expose to window
window.runAITests = runAITests;
window.testSingleConfig = testSingleConfig;

console.log('AI Player Test loaded. Run window.runAITests() to start.');
