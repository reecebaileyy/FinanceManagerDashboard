# Sprint 3 Bug Tracker

| Bug ID          | Title                                         | Status | Severity | Found In Build                             | Test Reference                                             | Owner        | Resolution Notes                                                                                                                         |
| --------------- | --------------------------------------------- | ------ | -------- | ------------------------------------------ | ---------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-2025-11-001 | Vitest runtime missing `happy-dom` dependency | Open   | Medium   | Build #4 (`feature/sprint3-budget-export`) | `npm run test src/features/budgets/budgets-export.test.ts` | Reece Bailey | `npm run test` fails with `ERR_MODULE_NOT_FOUND`. Install `happy-dom` in root `package.json` or adjust Vitest environment before CI run. |

## Log

- **2025-11-11**: Logged during Sprint 3 Cycle A testing after CSV export feature implementation. Blocking automated unit test execution.
