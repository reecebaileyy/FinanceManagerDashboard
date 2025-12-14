# Game Implementation Guide

## Overview
The Finance Manager Dashboard now includes two Unity games with automatic difficulty selection based on financial performance:

### 1. **Budgeting Game** (Budgets Page)
- Located in the Budgets section
- Difficulty based on budget variance

### 2. **Emergency Cushion Game** (Goals Page)
- Located in the Goals section  
- Difficulty based on goal achievement (binary: easy/hard)

---

## Difficulty Calculation

### Budgeting Game
- **Hard Mode**: Budget variance ≥ 20% (overspending)
- **Normal Mode**: Budget variance between -20% and 20% (on track)
- **Easy Mode**: Budget variance ≤ -20% (under budget/saving money)

### Emergency Cushion Game
- **Hard Mode**: Goal deadline passed OR user is behind/needs attention
- **Easy Mode**: Goal completed OR user is ahead/on track

---

## Date Simulator for Testing

### Purpose
Allows testing of date-dependent features (especially goal deadlines) without waiting for real dates to pass.

### How to Use
1. Look for the **📅 Real Time** button in the bottom-right corner of the screen
2. Click to open the Date Simulator panel
3. Select a date to simulate
4. Click **"Set Date"** to activate simulation
5. The page will reload with the simulated date
6. Click **"Reset to Real Time"** to return to actual current date

### Persistence
- Simulated date persists across page reloads
- Stored in browser localStorage
- Affects all date-dependent calculations

---

## File Structure

### Core Components
```
src/
├── components/
│   ├── date-simulator/
│   │   ├── date-simulator.tsx        # UI component for date simulation
│   │   ├── date-simulator.module.css # Styling
│   │   └── index.ts                  # Export
│   └── unity-game/
│       ├── game-modal.tsx            # Game modal wrapper
│       ├── difficulty-selector.tsx    # Difficulty selection UI (bypassed when autoStart=true)
│       ├── unity-game-player.tsx     # Unity WebGL player
│       └── types.ts                  # TypeScript types
├── lib/
│   ├── date-simulator.ts             # Date simulation logic
│   └── game-difficulty.ts            # Difficulty calculation logic
└── features/
    ├── budgets/
    │   └── budgets-section.tsx       # Budgets page with Budgeting Game
    └── goals/
        └── goals-section.tsx         # Goals page with Emergency Cushion Game
```

### Unity Game Files
```
public/unity-game/
├── BudgetingEasy/
├── BudgetingNormal/
├── BudgetingHard/
├── EmergencyCushionEasy/
└── EmergencyCushionHard/
```

---

## Testing Scenarios

### Budgeting Game

#### Test Easy Mode
1. Open Date Simulator
2. Set date to current month
3. Go to Budgets page
4. Create/edit budgets to show -20% or better variance
5. Click "🎮 Play Game"
6. Should load **BudgetingEasy**

#### Test Normal Mode
1. Go to Budgets page
2. Ensure variance is between -20% and 20%
3. Click "🎮 Play Game"
4. Should load **BudgetingNormal**

#### Test Hard Mode
1. Go to Budgets page
2. Create/edit budgets to show +20% or worse variance
3. Click "🎮 Play Game"
4. Should load **BudgetingHard**

### Emergency Cushion Game

#### Test Easy Mode (Goal Met Before Deadline)
1. Open Date Simulator
2. Go to Goals page
3. Select a goal that's ahead/on-track or completed
4. Click "🎮 Play Game"
5. Should load **EmergencyCushionEasy**
6. Title should show: "{Goal Name} Challenge: Difficulty Easy"

#### Test Hard Mode (Goal Missed Deadline)
1. Open Date Simulator
2. Set date to AFTER a goal's target date
3. Go to Goals page
4. Select that goal (should be incomplete)
5. Click "🎮 Play Game"
6. Should load **EmergencyCushionHard**
7. Reason should say: "Goal deadline passed and only X% complete"

#### Test Hard Mode (Goal Behind Schedule)
1. Open Date Simulator
2. Set date to BEFORE a goal's target date
3. Go to Goals page
4. Create/select a goal with health status "behind" or "attention"
5. Click "🎮 Play Game"
6. Should load **EmergencyCushionHard**

---

## Key Functions

### `getCurrentDate()` - lib/date-simulator.ts
Returns either the simulated date or the actual current date

### `calculateBudgetDifficulty()` - lib/game-difficulty.ts
Calculates difficulty based on budget variance percentage

### `calculateEmergencyCushionDifficulty()` - lib/game-difficulty.ts
Calculates difficulty based on goal deadline and health status

### `getDifficultyRecommendation()` - lib/game-difficulty.ts
Main function that determines which game difficulty to use
- Accepts budget metrics and/or goals
- Returns difficulty + explanation reason

---

## Integration Points

### Budgets Page
```typescript
const handleOpenGame = () => {
  const recommendation = getDifficultyRecommendation(metrics);
  setGameRecommendation(recommendation);
  setShowGameModal(true);
};

<GameModal
  isOpen={showGameModal}
  onClose={handleCloseGame}
  recommendedDifficulty={gameRecommendation?.difficulty}
  recommendationReason={gameRecommendation?.reason}
  autoStart={true}
  gameType="budgeting"
  gameTitle="Budgeting Game"
/>
```

### Goals Page
```typescript
function handleOpenGame() {
  if (!selectedGoal) return;
  
  const recommendation = getDifficultyRecommendation(
    undefined, 
    undefined, 
    referenceDate, 
    selectedGoal
  );
  setGameRecommendation(recommendation);
  setShowGameModal(true);
}

<GameModal
  isOpen={showGameModal}
  onClose={handleCloseGame}
  recommendedDifficulty={gameRecommendation?.difficulty}
  recommendationReason={gameRecommendation?.reason}
  autoStart={true}
  gameType="emergency-cushion"
  gameTitle={selectedGoal ? `${selectedGoal.name} Challenge` : 'Emergency Cushion'}
/>
```

---

## Troubleshooting

### Game doesn't load
- Check browser console for errors
- Verify Unity game files exist in `/public/unity-game/`
- Ensure correct folder structure and file names

### Wrong difficulty selected
- Verify budget variance calculation in Budgets page
- Check goal health status in Goals page
- Use Date Simulator to test different dates
- Check console logs for difficulty calculation

### Date not updating
- Clear localStorage and reload page
- Check if Date Simulator is active (📅 Simulating badge)
- Verify getCurrentDate() is being called in calculations

### Date Simulator not visible
- Check bottom-right corner of screen
- Component should be present on both Budgets and Goals pages
- Verify imports in both page components

---

## Future Enhancements

- Add "Normal" difficulty for Emergency Cushion game
- More granular difficulty calculations
- Additional game types for other sections
- Game progress saving
- Achievements/rewards system
