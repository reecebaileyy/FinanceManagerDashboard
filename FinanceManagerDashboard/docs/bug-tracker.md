# Sprint 3 Bug Tracker

| Bug ID          | Title                                              | Status   | Severity | Found In Build                              | Fixed In Build     | Test Reference                                              | Owner        | Resolution Notes                                                                                                                                         |
| --------------- | -------------------------------------------------- | -------- | -------- | ------------------------------------------- | ------------------ | ----------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-2025-11-001 | Vitest runtime missing `happy-dom` dependency      | Resolved | Medium   | `f65a610` (`feature/sprint3-budget-export`) | `16efc81` (main)   | `npm run test src/features/budgets/budgets-export.test.ts`  | Reece Bailey | Dependency was already present in `package.json`. Issue resolved by ensuring proper Vitest configuration. Test execution verified passing on 2025-11-11. |
| BUG-2025-10-001 | Login/Signup page shows 404 error                  | Resolved | High     | `751cc58` (initial auth implementation)     | `a053963`          | Manual testing: Navigation to `/login` and `/signup` routes | Reece Bailey | Fixed incorrect route configuration. Updated Next.js App Router paths to match expected URLs. Verified in build `a053963`.                               |
| BUG-2025-10-002 | Login and Create account tabs display after signin | Resolved | Medium   | `a053963`                                   | `b3f3943` (PR #25) | Manual testing: Auth state after successful login           | Reece Bailey | Fixed conditional rendering logic in navigation component. Tabs now properly hide after authentication. Verified in build `b3f3943`.                     |
| BUG-2025-10-003 | Browser resize causes content overlay              | Resolved | Medium   | `4b2f151` (initial frontend)                | `f964ac6`          | Manual testing: Responsive layout at various viewport sizes | Reece Bailey | Fixed CSS layout issues causing content bleeding. Updated responsive breakpoints and grid system. Verified in build `f964ac6`.                           |
| BUG-2025-10-004 | AI Assistant non-responsive or network errors      | Resolved | Medium   | `ae641b9`                                   | `436ac4b`          | Manual testing: AI chat functionality                       | Reece Bailey | Fixed by adding Azure OpenAI endpoint configuration and credentials in local environment file. Verified in build `436ac4b`.                              |
| BUG-2025-10-005 | Signup test uses incorrect role value              | Resolved | Low      | `aec008d` (PR #24)                          | `f00e2b2` (PR #30) | `src/features/auth/signup-section.test.tsx`                 | Reece Bailey | Updated test to use 'individual' role instead of 'user' to align with component's allowed values. Verified in build `f00e2b2`.                           |

## Bug Tracking Methodology

### Bug Identification

- Each bug is assigned a unique ID following format: `BUG-YYYY-MM-NNN`
- Bugs are discovered through:
  - Automated test failures
  - Manual testing scenarios
  - Code review findings
  - User-reported issues

### Build Tracking

- **Found In Build**: Commit hash where bug was first identified
- **Fixed In Build**: Commit hash where bug resolution was merged
- Build IDs enable traceability between test execution and bug resolution

### Test References

- Each bug links to the test case or manual test scenario that detected it
- Test references include file paths for automated tests
- Manual tests include step-by-step reproduction instructions

### Resolution Verification

- All resolved bugs include verification steps
- Resolution confirmed through test execution or manual validation
- Build IDs provide evidence of fix deployment

## Log

### Sprint 3

- **2025-11-11**: BUG-2025-11-001 logged during Sprint 3 Cycle A testing after CSV export feature implementation. Verified resolved - test execution passes.
- **2025-11-11**: Updated bug tracker with formal tracking methodology including build IDs, test references, and resolution verification.

### Sprint 2

- **2025-10-18**: BUG-2025-10-005 identified during test suite execution. Fixed same day.
- **2025-10-15**: BUG-2025-10-002 identified during manual testing. Fixed in PR #25.
- **2025-10-13**: BUG-2025-10-001 and BUG-2025-10-004 identified and resolved.
- **2025-10-13**: BUG-2025-10-003 identified during responsive design testing. Fixed same day.

## Bug Statistics

- **Total Bugs Tracked**: 6
- **Resolved**: 6
- **Open**: 0
- **Average Resolution Time**: < 2 days
- **Critical Bugs**: 1 (all resolved)
- **Medium Severity**: 4 (all resolved)
- **Low Severity**: 1 (resolved)
