# Multi-Game Implementation - Goals Section

## Overview
The Finance Manager Dashboard now supports multiple Unity games that are dynamically selected based on the goal type. Each goal has its own "Play Game" button that launches the appropriate game.

---

## Supported Games

### 1. **Emergency Cushion Game**
- **Triggers**: Goals with "Emergency" in name or category
- **Folders**: 
  - `public/unity-game/EmergencyCushionEasy/`
  - `public/unity-game/EmergencyCushionHard/`
- **Difficulty**: Binary (Easy/Hard)

### 2. **Family Summer Vacation Game**
- **Triggers**: Goals with "Travel", "Vacation", "Trip", or "Adventure" in name/category
- **Folders**: 
  - `public/unity-game/FamilySummerVacationEasy/`
  - `public/unity-game/FamilySummerVacationHard/`
- **Difficulty**: Binary (Easy/Hard)

### 3. **Budgeting Game** (Default)
- **Triggers**: Used for all other goals (fallback)
- **Location**: Budgets page
- **Difficulty**: Easy/Normal/Hard

---

## How It Works

### Game Selection Logic

The system uses the `getGameTypeForGoal()` function to determine which game to play:

```typescript
export function getGameTypeForGoal(goal: Goal): GameType {
  const goalNameLower = goal.name.toLowerCase();
  const goalCategoryLower = goal.category.toLowerCase();
  
  // Emergency goals
  if (goalCategoryLower.includes('emergency') || 
      goalNameLower.includes('emergency') || 
      goalNameLower.includes('cushion')) {
    return 'emergency-cushion';
  }
  
  // Travel/Vacation goals
  if (goalCategoryLower.includes('travel') || 
      goalNameLower.includes('vacation') || 
      goalNameLower.includes('trip') || 
      goalNameLower.includes('adventure')) {
    return 'family-vacation';
  }
  
  // Default fallback
  return 'emergency-cushion';
}
```

### Difficulty Calculation

All goal-based games use the same difficulty logic:
- **Easy Mode**: Goal is completed OR on track/ahead OR deadline not passed
- **Hard Mode**: Deadline passed and goal incomplete OR goal significantly behind

---

## User Interface

### Goals Page Layout

Each goal card now includes:
1. Goal information (name, category, progress)
2. Health status badge
3. Progress bar
4. Contribution details
5. **🎮 Play Game button** (NEW)
6. Tags

### Play Button Behavior

- Clicking "Play Game" on any goal:
  1. Determines the appropriate game type
  2. Calculates difficulty based on goal status
  3. Opens game modal with the correct Unity build
  4. Shows game title as "{Goal Name} Challenge"

- Only one game can be played at a time (modal-based)
- Game selection doesn't interfere with goal selection
- Button uses `e.stopPropagation()` to prevent row selection

---

## File Structure

### Modified Files

```
src/
├── components/
│   └── unity-game/
│       ├── types.ts                    # Added 'family-vacation' type
│       └── unity-game-player.tsx       # Added vacation game config
├── lib/
│   └── game-difficulty.ts              # Added getGameTypeForGoal() & getGameTitle()
└── features/
    └── goals/
        ├── goals-section.tsx           # Added individual play buttons
        └── goals-section.module.css    # Added .goalActions styling
```

### Unity Game Files Required

```
public/unity-game/
├── EmergencyCushionEasy/
│   └── Build/
│       ├── EmergencyCushionEasy.loader.js
│       ├── EmergencyCushionEasy.data
│       ├── EmergencyCushionEasy.framework.js
│       └── EmergencyCushionEasy.wasm
├── EmergencyCushionHard/
│   └── Build/
│       └── [same structure]
├── FamilySummerVacationEasy/
│   └── Build/
│       ├── FamilySummerVacationEasy.loader.js
│       ├── FamilySummerVacationEasy.data
│       ├── FamilySummerVacationEasy.framework.js
│       └── FamilySummerVacationEasy.wasm
└── FamilySummerVacationHard/
    └── Build/
        └── [same structure]
```

---

## Testing Scenarios

### Test Emergency Cushion Game

1. Go to Goals page
2. Click on "Emergency Cushion" goal
3. Click "🎮 Play Game" button
4. Should show: **"Emergency Cushion Challenge: Difficulty Easy"**
5. EmergencyCushionEasy Unity game should load

### Test Family Vacation Game

1. Go to Goals page
2. Click on "Family Summer Adventure" goal (or any goal with "vacation"/"trip" in name)
3. Click "🎮 Play Game" button
4. Should show: **"Family Summer Adventure Challenge: Difficulty Easy"**
5. FamilySummerVacationEasy Unity game should load

### Test Multiple Goals

1. Go to Goals page
2. Each goal should have its own "Play Game" button
3. Click different play buttons - each should launch the correct game
4. Clicking a play button should NOT select that goal
5. Only one game modal can be open at a time

### Test Deadline Logic with Date Simulator

**Easy Mode (Before Deadline):**
1. Open Date Simulator (📅 button)
2. Set date to before goal's target date
3. Click "Play Game" on any goal that's on track
4. Should load Easy mode

**Hard Mode (After Deadline):**
1. Open Date Simulator
2. Set date to after goal's target date
3. Click "Play Game" on incomplete goal
4. Should load Hard mode
5. Reason should say: "Goal deadline passed and only X% complete"

---

## Adding New Games

To add a new game type:

### 1. Add Game Type

**File**: `src/components/unity-game/types.ts`

```typescript
export type GameType = 'budgeting' | 'emergency-cushion' | 'family-vacation' | 'YOUR-NEW-GAME';
```

### 2. Add Unity Configuration

**File**: `src/components/unity-game/unity-game-player.tsx`

```typescript
const yourNewGameConfig = {
  easy: {
    folder: 'YourNewGameEasy',
    buildName: 'YourNewGameEasy',
    productName: 'Your New Game - Easy',
  },
  hard: {
    folder: 'YourNewGameHard',
    buildName: 'YourNewGameHard',
    productName: 'Your New Game - Hard',
  },
};

// In the loadUnityGame function, add to switch:
case 'your-new-game':
  configMap = yourNewGameConfig;
  break;
```

### 3. Add Game Selection Logic

**File**: `src/lib/game-difficulty.ts`

```typescript
export function getGameTypeForGoal(goal: Goal): GameType {
  const goalNameLower = goal.name.toLowerCase();
  const goalCategoryLower = goal.category.toLowerCase();
  
  // ... existing conditions ...
  
  // Your new game triggers
  if (goalNameLower.includes('keyword') || goalCategoryLower.includes('category')) {
    return 'your-new-game';
  }
  
  return 'emergency-cushion'; // default
}
```

### 4. Add Unity Build Files

Place your Unity WebGL build in:
```
public/unity-game/YourNewGameEasy/Build/
public/unity-game/YourNewGameHard/Build/
```

---

## Game Title Customization

Game titles are automatically generated using the goal name:

```typescript
export function getGameTitle(gameType: GameType, goal: Goal): string {
  switch (gameType) {
    case 'emergency-cushion':
      return `${goal.name} Challenge`;
    case 'family-vacation':
      return `${goal.name} Challenge`;
    case 'your-new-game':
      return `${goal.name} Adventure`; // Customize here
    default:
      return goal.name;
  }
}
```

---

## Key Features

### ✅ Dynamic Game Selection
- Automatically chooses correct game based on goal type
- No manual selection required
- Seamless user experience

### ✅ Individual Play Buttons
- Each goal has its own button
- No confusion about which goal is being played
- Clear visual association

### ✅ Single Modal
- Only one game can run at a time
- Clean UI with modal overlay
- Easy to close and switch games

### ✅ Difficulty Auto-Calculation
- Same logic for all goal-based games
- Based on deadline and progress
- Clear explanation shown to user

### ✅ Date Testing
- Date simulator works with all games
- Easy to test deadline scenarios
- Persistent across sessions

---

## Example Goal-to-Game Mappings

| Goal Name | Category | Game Type | Build Folder |
|-----------|----------|-----------|--------------|
| Emergency Cushion | Emergency | emergency-cushion | EmergencyCushion{Easy/Hard} |
| Family Summer Adventure | Travel | family-vacation | FamilySummerVacation{Easy/Hard} |
| Hawaii Trip Fund | Savings | family-vacation | FamilySummerVacation{Easy/Hard} |

---

## Troubleshooting

### Game Doesn't Load
**Problem**: Clicking "Play Game" shows error or doesn't load

**Solutions**:
1. Check Unity build files exist in `public/unity-game/[GameName]/Build/`
2. Verify folder names match exactly (case-sensitive)
3. Check browser console for loading errors
4. Ensure all 4 files present: .loader.js, .data, .framework.js, .wasm

### Wrong Game Loads
**Problem**: Emergency goal loads vacation game, or vice versa

**Solutions**:
1. Check goal name and category spelling
2. Review `getGameTypeForGoal()` logic in `game-difficulty.ts`
3. Keywords are case-insensitive, but must be in name or category
4. Add console.log to debug which game type is selected

### Button Doesn't Work
**Problem**: Clicking "Play Game" button selects the goal instead

**Solutions**:
1. Verify `e.stopPropagation()` is present in onClick handler
2. Check button is inside goal row but not interfering with row click
3. Inspect CSS - button should have `position: relative` if needed

### Wrong Difficulty
**Problem**: Easy goal shows hard mode, or vice versa

**Solutions**:
1. Use Date Simulator to check current date vs. deadline
2. Review goal's health status (behind/attention/ahead/onTrack)
3. Check `calculateEmergencyCushionDifficulty()` logic
4. Verify `getCurrentDate()` is being used (not `new Date()`)

---

## Future Enhancements

- [ ] Add more game types (Debt Payoff, Investment, etc.)
- [ ] Support for Normal difficulty in goal games
- [ ] Game progress tracking per goal
- [ ] Achievements/rewards for completing games
- [ ] Leaderboard integration
- [ ] Game analytics (time played, scores, etc.)

---

## Summary

✅ **3 Games Implemented**: Budgeting, Emergency Cushion, Family Vacation  
✅ **Individual Play Buttons**: Each goal has its own game button  
✅ **Smart Selection**: Automatically chooses correct game  
✅ **Single Modal**: Only one game at a time  
✅ **Date Testing**: Full simulator support  
✅ **Easy to Extend**: Add new games with minimal code

The system is now ready for users to play different games based on their financial goals!
