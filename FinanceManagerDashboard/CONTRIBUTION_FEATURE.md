# Goal Contribution Feature

## Overview
Users can now manually add contributions to their financial goals through an intuitive modal interface. This feature allows tracking one-time contributions, bonuses, and round-ups.

---

## How to Use

### Adding a Contribution

1. **Navigate to Goals Page**
2. **Select a goal** (click on it to view details in the right panel)
3. **Click "+ Add" button** (next to "Recent contributions" heading)
4. **Fill out the form:**
   - **Contribution Amount**: Enter dollar amount (e.g., "$500" or "500")
   - **Source**: Select from dropdown:
     - Manual Transfer (default)
     - Bonus/Windfall
     - Round-Up
   - **Note** (optional): Add context about the contribution
5. **Click "Add Contribution"**
6. Success message appears and goal updates immediately

### Visual Feedback

- ✅ Goal's current amount increases
- ✅ Progress bar updates
- ✅ Contribution appears in "Recent contributions" list
- ✅ Goal health status recalculates automatically
- ✅ Success message confirms the addition

---

## Features

### Automatic Updates

When you add a contribution, the system automatically:
- **Updates current amount**: Adds contribution to goal's progress
- **Caps at target**: Can't exceed the goal's target amount
- **Recalculates health**: Updates ahead/onTrack/attention/behind/completed status
- **Sorts contributions**: New contribution appears at top of list
- **Updates timestamps**: Records when contribution was made

### Contribution Types

**Manual Transfer**
- Regular contributions from your accounts
- Default option

**Bonus/Windfall**
- Tax refunds
- Performance bonuses
- Unexpected income

**Round-Up**
- Automatic savings from round-up programs
- Credit card rewards
- Cashback accumulations

### Smart Validation

- ❌ Cannot add negative or zero amounts
- ❌ Cannot add more than needed to complete goal (capped at target)
- ✅ Optional notes for context
- ✅ Immediate feedback on errors

---

## Technical Details

### API Function

```typescript
export interface AddContributionInput {
  goalId: string;
  amountCents: number;
  source: 'manual' | 'bonus' | 'roundUp';
  note?: string;
}

export async function addGoalContribution(input: AddContributionInput): Promise<Goal>
```

**Location**: `src/lib/api/goals.ts`

### Data Structure

```typescript
export interface GoalContribution {
  id: string;
  goalId: string;
  amountCents: number;
  contributedAt: string; // ISO date string
  source: 'manual' | 'rule' | 'roundUp' | 'bonus';
  note?: string;
}
```

### Health Recalculation

After adding a contribution, the goal's health status is recalculated:

```
IF current amount >= target amount:
  → COMPLETED

ELSE:
  Calculate expected progress based on timeline
  Calculate delta from expected
  
  IF delta > (tolerance * 2):
    → AHEAD
  ELSE IF delta < -(tolerance * 3):
    → BEHIND
  ELSE IF delta < -tolerance:
    → ATTENTION
  ELSE:
    → ON TRACK
```

---

## User Interface

### Contribution Modal

**Header:**
- Title: "Add Contribution to {Goal Name}"
- Close button

**Form Fields:**
1. **Contribution Amount** (required)
   - Text input with decimal support
   - Auto-focuses when modal opens
   - Accepts "$500" or "500" format

2. **Source** (required)
   - Dropdown select
   - Options: Manual Transfer, Bonus/Windfall, Round-Up
   - Defaults to "Manual Transfer"

3. **Note** (optional)
   - Textarea (3 rows)
   - For adding context/details

**Actions:**
- Cancel button (closes modal)
- Add Contribution button (submits form)
- Shows "Adding..." during submission

### Error Display

If validation fails, errors appear at top of form:
- Red border and background
- Bulleted list of error messages
- Accessible with `role="alert"`

### Success Message

After successful addition:
- Green success banner appears
- Shows: "Added $X.XX to {Goal Name}"
- Auto-dismisses after 4.5 seconds
- Same location as goal creation success message

---

## File Changes

### Modified Files

**API Layer:**
- `src/lib/api/goals.ts`
  - Added `AddContributionInput` interface
  - Added `addGoalContribution()` function

**UI Components:**
- `src/features/goals/goals-section.tsx`
  - Added contribution modal state
  - Added form handlers
  - Added modal UI
  - Added "+ Add" button to Recent contributions section

**Styling:**
- `src/features/goals/goals-section.module.css`
  - Added `.goalSectionHeader` for title + button layout
  - Added `.modalOverlay` and `.modalBackdrop`
  - Added `.contributionModal` and related styles
  - Added `.formErrors` styling

---

## Testing Scenarios

### Scenario 1: Add Manual Contribution

1. Go to Goals page
2. Select "Emergency Cushion" goal
3. Note current amount: $3,200.00
4. Click "+ Add" button
5. Enter amount: $500
6. Source: Manual Transfer
7. Note: "Extra savings this month"
8. Click "Add Contribution"
9. ✅ Modal closes
10. ✅ Success message appears
11. ✅ Current amount now shows: $3,700.00
12. ✅ Contribution appears in list
13. ✅ Progress bar updates

### Scenario 2: Add Bonus Contribution

1. Select "Family Summer Adventure" goal
2. Click "+ Add"
3. Enter amount: $1,200
4. Source: Bonus/Windfall
5. Note: "Year-end bonus applied"
6. Click "Add Contribution"
7. ✅ Goal progress increases
8. ✅ Contribution shows source as "bonus"

### Scenario 3: Complete a Goal

1. Select a goal close to target (e.g., $9,800 of $10,000)
2. Click "+ Add"
3. Enter amount: $500 (more than needed)
4. Click "Add Contribution"
5. ✅ Goal status changes to "Completed"
6. ✅ Current amount caps at $10,000 (target)
7. ✅ Health badge shows "Completed"

### Scenario 4: Validation Errors

1. Click "+ Add"
2. Leave amount empty
3. Click "Add Contribution"
4. ✅ Error appears: "Enter a contribution amount greater than zero."
5. Enter "0" or negative number
6. ✅ Same error appears

### Scenario 5: Cancel Action

1. Click "+ Add"
2. Enter some data
3. Click "Cancel"
4. ✅ Modal closes
5. ✅ No changes to goal
6. ✅ Form resets for next time

---

## Integration with Other Features

### Game Difficulty
- Adding contributions can change goal health status
- Changed health status affects game difficulty
- Easy goal might become easier if contribution pushes it ahead
- Behind goal might become on-track with sufficient contribution

### Date Simulator
- Contributions use current date (real or simulated)
- Test contribution timing with date simulator
- Contributions timestamped with simulated date when active

### Goal Projections
- Projections don't automatically update (they're based on planned contributions)
- Manual contributions are one-time adjustments
- Future enhancement: could recalculate projections

---

## Known Limitations

### Current Implementation

1. **No Backend Persistence**
   - Contributions are added to in-memory state
   - Refreshing the page resets to fixture data
   - This is by design for the demo/prototype

2. **No Edit/Delete**
   - Cannot edit existing contributions
   - Cannot delete contributions
   - Would need additional UI/API for this

3. **No Automatic Contributions**
   - Only manual addition supported
   - "Autopilot" contributions are displayed but not automated
   - Would need scheduled job/backend integration

4. **Projections Don't Update**
   - Projection graph shows original planned amounts
   - One-time contributions don't affect future projections
   - Expected behavior for ad-hoc contributions

---

## Future Enhancements

### Potential Features

- [ ] **Edit Contribution**: Modify existing contribution amounts/notes
- [ ] **Delete Contribution**: Remove incorrect contributions
- [ ] **Bulk Import**: Upload CSV of multiple contributions
- [ ] **Recurring Setup**: Schedule automatic contributions
- [ ] **Photo Attachment**: Attach receipt/proof images
- [ ] **Categories**: Tag contributions by category
- [ ] **Export History**: Download contribution history as CSV
- [ ] **Contribution Analytics**: Charts showing contribution patterns
- [ ] **Notification Reminders**: Alert when contribution is due
- [ ] **Split Contributions**: Divide one payment across multiple goals

### Backend Integration

For production, you would:
1. Create POST `/api/goals/{goalId}/contributions` endpoint
2. Validate contribution on server
3. Update database
4. Recalculate goal metrics server-side
5. Return updated goal
6. Update React Query cache

---

## Code Examples

### Adding a Contribution Programmatically

```typescript
import { addGoalContribution } from '@lib/api/goals';

// Add $500 manual contribution
await addGoalContribution({
  goalId: 'goal-emergency-fund',
  amountCents: 50000, // $500.00 in cents
  source: 'manual',
  note: 'Extra savings this month'
});
```

### Accessing Contributions in Components

```typescript
const sortedContributions = selectedGoal.contributions.sort(
  (a, b) => new Date(b.contributedAt).getTime() - new Date(a.contributedAt).getTime()
);

// Display most recent 5
sortedContributions.slice(0, 5).map(contribution => (
  <div key={contribution.id}>
    <span>{formatCents(contribution.amountCents)}</span>
    <span>{contribution.source}</span>
    {contribution.note && <span>{contribution.note}</span>}
  </div>
));
```

---

## Troubleshooting

### Modal Doesn't Open

**Problem**: Clicking "+ Add" button does nothing

**Solutions:**
1. Verify a goal is selected (check selectedGoal state)
2. Check browser console for errors
3. Verify `showContributionModal` state updates
4. Check if modal is rendering but hidden (inspect DOM)

### Contribution Doesn't Save

**Problem**: Clicking "Add Contribution" closes modal but goal doesn't update

**Solutions:**
1. Check browser console for API errors
2. Verify `addGoalContribution` function is imported
3. Check React Query cache update logic
4. Verify goal ID matches

### Amount Not Parsing

**Problem**: Entering "$500" or other formats doesn't work

**Solutions:**
1. The `parseCurrencyToCents()` function handles common formats
2. Removes non-numeric characters except dots and dashes
3. If still failing, check the parsing logic in the function

### Health Status Wrong

**Problem**: Adding contribution doesn't update health badge

**Solutions:**
1. Health is recalculated in `addGoalContribution()`
2. Check tolerance thresholds in calculation
3. Verify expected progress calculation is correct
4. May need to adjust timeline/dates if using date simulator

---

## Summary

✅ **Fully Implemented**: Users can now add contributions to goals  
✅ **Clean UI**: Modal-based form with clear fields  
✅ **Smart Updates**: Automatic health recalculation  
✅ **Validation**: Prevents invalid contributions  
✅ **User Feedback**: Success messages and error handling  
✅ **Integrated**: Works with date simulator and game difficulty  

The contribution feature is ready to use!
