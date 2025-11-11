# Test Cases - Finance Manager Dashboard

## Document Information

- **Project**: Finance Manager Dashboard
- **Version**: Sprint 3
- **Date**: November 11, 2025
- **Author**: Development Team
- **Total Test Files**: 27
- **Total Test Cases**: 96

## Test Case Overview

This document provides detailed specifications for all test cases in the Finance Manager Dashboard, linking each test to the documented test plan methodologies and providing clear execution instructions.

## Test Case Categories

### Frontend Tests (24 files, 82 test cases)

- **Methodology**: Unit Testing (Vitest + Testing Library)
- **Environment**: happy-dom
- **Coverage**: React components, hooks, and utilities
- **Sprint 3 Additions**: Budget CSV export UI flow, insights follow-up persistence

### End-to-End Tests (Playwright) – New

- **Files**: `tests/e2e/budget-export.spec.ts`, `tests/e2e/auth-suspended.spec.ts`
- **Test Cases**: 6
- **Methodology**: Browser automation (Playwright Test)
- **Environment**: Playwright (Chromium, Firefox)
- **Coverage**: CSV export smoke path, suspended account login handling

### Backend Tests (2 files, 10 test cases)

- **Methodology**: Unit Testing (Vitest + Node.js environment)
- **Environment**: Node.js
- **Coverage**: API endpoints, auth session lifecycle, suspension enforcement

## Detailed Test Cases

### TC-001: Authentication Session Cookie Management

- **File**: `src/features/auth/session/cookie.test.ts`
- **Test Cases**: 5
- **Methodology**: Unit Testing
- **Purpose**: Validate secure cookie handling for user sessions
- **Steps**:
  1. Initialize cookie manager
  2. Set secure session cookie
  3. Retrieve and validate cookie
  4. Test cookie expiration
  5. Test cookie cleanup
- **Expected Results**: All cookie operations work securely
- **Configuration**: Requires secure cookie settings

### TC-002: Dashboard Layout Management

- **File**: `src/features/dashboard/use-dashboard-layout.test.tsx`
- **Test Cases**: 3
- **Methodology**: Unit Testing (React Hook)
- **Purpose**: Test dashboard layout state management
- **Steps**:
  1. Initialize layout hook
  2. Test layout state updates
  3. Validate layout persistence
- **Expected Results**: Layout state managed correctly
- **Configuration**: Mock localStorage

### TC-003: Dashboard Section Component

- **File**: `src/features/dashboard/dashboard-section.test.tsx`
- **Test Cases**: 5
- **Methodology**: Integration Testing
- **Purpose**: Test complete dashboard rendering and interactions
- **Steps**:
  1. Render dashboard component
  2. Test widget interactions
  3. Validate data loading
  4. Test responsive behavior
  5. Test error handling
- **Expected Results**: Dashboard renders and functions correctly
- **Configuration**: Mock API responses

### TC-004: Savings Automation Section

- **File**: `src/features/savings/savings-automation-section.test.tsx`
- **Test Cases**: 3
- **Methodology**: Integration Testing
- **Purpose**: Test savings automation workflow
- **Steps**:
  1. Test fixed amount rule creation
  2. Test percentage strategy switching
  3. Validate paycheck input requirements
- **Expected Results**: All savings automation features work
- **Configuration**: Mock financial data

### TC-005: Budgets Section Component

- **File**: `src/features/budgets/budgets-section.test.tsx`
- **Test Cases**: 4
- **Methodology**: Integration Testing
- **Purpose**: Test budget creation and management
- **Steps**:
  1. Test new budget creation
  2. Validate budget calculations
  3. Test budget editing
  4. Test budget deletion
- **Expected Results**: Budget management works correctly
- **Configuration**: Mock budget data

### TC-006: Reports Workspace

- **File**: `src/features/reports/reports-workspace.test.tsx`
- **Test Cases**: 3
- **Methodology**: Integration Testing
- **Purpose**: Test report generation and sharing
- **Steps**:
  1. Test export queue functionality
  2. Test share link creation
  3. Validate report status updates
- **Expected Results**: Report generation and sharing work
- **Configuration**: Mock report service

### TC-007: Transactions Section

- **File**: `src/features/transactions/transactions-section.test.tsx`
- **Test Cases**: 4
- **Methodology**: Integration Testing
- **Purpose**: Test transaction management and bulk operations
- **Steps**:
  1. Test bulk tag updates
  2. Test import queue functionality
  3. Validate transaction filtering
  4. Test transaction editing
- **Expected Results**: Transaction management works correctly
- **Configuration**: Mock transaction data

### TC-008: Login Section Component

- **File**: `src/features/auth/login-section.test.tsx`
- **Test Cases**: 3
- **Methodology**: Integration Testing
- **Purpose**: Test user authentication flow
- **Steps**:
  1. Test valid credential submission
  2. Test success message display
  3. Test error handling
- **Expected Results**: Login flow works correctly
- **Configuration**: Mock authentication service

### TC-009: Settings Section Component

- **File**: `src/features/settings/settings-section.test.tsx`
- **Test Cases**: 4
- **Methodology**: Integration Testing
- **Purpose**: Test user settings management
- **Steps**:
  1. Test notification changes
  2. Test account synchronization
  3. Test account deletion confirmation
  4. Validate settings persistence
- **Expected Results**: Settings management works correctly
- **Configuration**: Mock settings service

### TC-010: Session Context Provider

- **File**: `src/features/auth/context/session-context.test.tsx`
- **Test Cases**: 4
- **Methodology**: Unit Testing (React Context)
- **Purpose**: Test session state management across components
- **Steps**:
  1. Test context initialization
  2. Test session state updates
  3. Test context provider behavior
  4. Test context consumer behavior
- **Expected Results**: Session context works correctly
- **Configuration**: Mock session data

### TC-011: Bills Section Component

- **File**: `src/features/bills/bills-section.test.tsx`
- **Test Cases**: 3
- **Methodology**: Integration Testing
- **Purpose**: Test bill management functionality
- **Steps**:
  1. Test bill state toggling
  2. Test bill creation
  3. Test bill editing
- **Expected Results**: Bill management works correctly
- **Configuration**: Mock bill data

### TC-012: Two-Factor Authentication

- **File**: `src/features/auth/two-factor-section.test.tsx`
- **Test Cases**: 3
- **Methodology**: Integration Testing
- **Purpose**: Test 2FA verification process
- **Steps**:
  1. Test 6-digit code submission
  2. Test code validation
  3. Test error handling
- **Expected Results**: 2FA verification works correctly
- **Configuration**: Mock 2FA service

### TC-013: User Registration

- **File**: `src/features/auth/signup-section.test.tsx`
- **Test Cases**: 2
- **Methodology**: Integration Testing
- **Purpose**: Test user registration flow
- **Steps**:
  1. Test valid registration data submission
  2. Test password mismatch error handling
- **Expected Results**: Registration flow works correctly
- **Configuration**: Mock registration service

### TC-014: Financial Goals Management

- **File**: `src/features/goals/goals-section.test.tsx`
- **Test Cases**: 3
- **Methodology**: Integration Testing
- **Purpose**: Test financial goal creation and management
- **Steps**:
  1. Test goal creation wizard
  2. Test AI recommendation requests
  3. Test goal progress tracking
- **Expected Results**: Goal management works correctly
- **Configuration**: Mock goal service

### TC-015: Landing Page Component

- **File**: `src/features/landing/landing-section.test.tsx`
- **Test Cases**: 2
- **Methodology**: Unit Testing
- **Purpose**: Test landing page rendering and navigation
- **Steps**:
  1. Test page rendering
  2. Test navigation links
- **Expected Results**: Landing page renders correctly
- **Configuration**: Mock navigation

### TC-016: Insights Workspace

- **File**: `src/features/insights/insights-workspace.test.tsx`
- **Test Cases**: 4
- **Methodology**: Integration Testing
- **Purpose**: Test financial insights and analytics
- **Steps**:
  1. Test insights data loading
  2. Test chart rendering
  3. Test insight filtering
  4. Test insight sharing
- **Expected Results**: Insights workspace works correctly
- **Configuration**: Mock insights data

### TC-017: Password Reset Flow

- **File**: `src/features/auth/forgot-password-section.test.tsx`
- **Test Cases**: 3
- **Methodology**: Integration Testing
- **Purpose**: Test password reset functionality
- **Steps**:
  1. Test email submission
  2. Test success confirmation
  3. Test error handling
- **Expected Results**: Password reset works correctly
- **Configuration**: Mock password reset service

### TC-018: CSRF Protection

- **File**: `src/lib/security/csrf.test.ts`
- **Test Cases**: 4
- **Methodology**: Unit Testing
- **Purpose**: Test CSRF token generation and validation
- **Steps**:
  1. Test token generation
  2. Test token validation
  3. Test token expiration
  4. Test token cleanup
- **Expected Results**: CSRF protection works correctly
- **Configuration**: Mock crypto functions

### TC-019: CSRF Context Provider

- **File**: `src/lib/security/csrf-context.test.tsx`
- **Test Cases**: 3
- **Methodology**: Unit Testing (React Context)
- **Purpose**: Test CSRF context management
- **Steps**:
  1. Test context initialization
  2. Test token refresh
  3. Test context cleanup
- **Expected Results**: CSRF context works correctly
- **Configuration**: Mock CSRF service

### TC-020: Backend API Testing

- **File**: `backend/server/index.test.ts`
- **Test Cases**: 8
- **Methodology**: Unit Testing (Node.js)
- **Purpose**: Test backend API endpoints and business logic
- **Steps**:
  1. Test API endpoint responses
  2. Test request validation
  3. Test error handling
  4. Test authentication middleware
  5. Test rate limiting
  6. Test CORS configuration
  7. Test health check endpoint
  8. Test API documentation
- **Expected Results**: All API endpoints work correctly
- **Configuration**: Mock database and external services

### TC-021: Theme Provider

- **File**: `src/features/theme/theme-provider.test.tsx`
- **Test Cases**: 2
- **Methodology**: Unit Testing
- **Purpose**: Test theme management and persistence
- **Steps**:
  1. Test theme switching
  2. Test theme persistence
- **Expected Results**: Theme management works correctly
- **Configuration**: Mock localStorage

### TC-022: Budget CSV Export Utility

- **File**: `src/features/budgets/budgets-export.test.ts`
- **Test Cases**: 5
- **Methodology**: Unit Testing
- **Purpose**: Ensure CSV export builder formats budgets correctly for downstream accounting tools.
- **Steps**:
  1. Transform budget model to CSV rows with deterministic header order.
  2. Ensure currency fields round to two decimals and include negative variance.
  3. Omit rollover column when feature disabled.
  4. Include category-level totals per row.
  5. Generate deterministic filenames using mocked timestamp.
- **Expected Results**: Exported CSV matches finance stakeholder specification.
- **Configuration**: Locale `en-US`, mocked `Date`, in-memory budgets fixture.

### TC-023: Budgets Export Modal Interaction

- **File**: `src/features/budgets/budgets-section.test.tsx`
- **Test Cases**: 4
- **Methodology**: Integration Testing
- **Purpose**: Validate UI-driven export workflow and analytics logging.
- **Steps**:
  1. Trigger export modal via “Export” button.
  2. Select export scope (current period vs custom range).
  3. Confirm download initiation and toast messaging.
  4. Surface error banner when export fails.
- **Expected Results**: Export path works end-to-end with optimistic UI feedback.
- **Configuration**: Mock file writer and analytics transport.

### TC-024: Budget CSV Playwright Smoke

- **File**: `tests/e2e/budget-export.spec.ts`
- **Test Cases**: 3
- **Methodology**: End-to-End Testing
- **Purpose**: Confirm CSV download success across browsers.
- **Steps**:
  1. Authenticate and navigate to budgets workspace.
  2. Trigger export and capture download artifact.
  3. Parse CSV to confirm headers and row counts.
- **Expected Results**: CSV saved with expected schema in Chromium and Firefox.
- **Configuration**: Playwright download fixtures, seeded budget data.

### TC-025: Auth Suspension Enforcement

- **File**: `services/auth/test/auth-service.spec.ts`
- **Test Cases**: 2
- **Methodology**: Unit Testing (Node.js)
- **Purpose**: Ensure suspended accounts cannot login or refresh sessions and that tampered refresh tokens are revoked.
- **Steps**:
  1. Attempt login with a suspended user (expect forbidden error).
  2. Attempt refresh using a suspended user token (expect forbidden and token revocation).
  3. Attempt refresh using tampered secret (expect unauthorized and token revocation).
- **Expected Results**: Suspended users are blocked consistently, with audit trail and token revocation.
- **Configuration**: In-memory auth repository helper, fake IP metadata.

### TC-026: Insights Follow-up Persistence

- **File**: `src/features/insights/insights-workspace.persistence.test.tsx`
- **Test Cases**: 2
- **Methodology**: Integration Testing
- **Purpose**: Ensure AI assistant follow-up prompts persist through remounts and cached sessions.
- **Steps**:
  1. Render workspace, confirm baseline follow-up prompts, unmount and remount with same query client.
  2. Send dining prompt to update follow-ups, unmount and remount, verify updated prompts remain.
- **Expected Results**: Follow-up prompts rehydrate correctly from React Query cache.
- **Configuration**: Shared test query client, `@testing-library/user-event`.

## Test Execution Instructions

### Prerequisites

1. Node.js 20.x installed
2. npm dependencies installed (`npm install`)
3. Test environment variables configured
4. Mock services running (if applicable)

### Execution Commands

```bash
# Run all tests
npm run test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test src/features/auth/login-section.test.tsx
```

### Test Data Requirements

- **User Accounts**: Test user credentials for authentication tests
- **Financial Data**: Mock transaction, budget, and goal data
- **API Responses**: Mock responses for external service calls
- **Configuration**: Test environment variables and settings

### Expected Execution Time

- **Full Test Suite**: < 5 minutes
- **Frontend Tests**: < 3 minutes
- **Backend Tests**: < 1 minute
- **Individual Test Files**: < 30 seconds each

## Test Maintenance

### Regular Updates

- **Weekly**: Review test failures and update test data
- **Monthly**: Update test cases for new features
- **Quarterly**: Refactor test code and improve coverage

### Test Case Lifecycle

1. **Creation**: New test cases created with feature development
2. **Execution**: Regular execution in CI/CD pipeline
3. **Maintenance**: Updates for feature changes
4. **Retirement**: Removal of obsolete test cases

## Coverage Analysis

### Current Coverage

- **Frontend Components**: 85% coverage
- **Backend APIs**: 90% coverage
- **Utility Functions**: 95% coverage
- **Integration Flows**: 80% coverage

### Coverage Goals

- **Overall Coverage**: 90%+
- **Critical Paths**: 100% coverage
- **Financial Calculations**: 100% coverage
- **Authentication**: 100% coverage

## Test Results Tracking

### Metrics Collected

- **Pass Rate**: Percentage of passing tests
- **Execution Time**: Time to complete test suite
- **Coverage**: Code coverage percentage
- **Flaky Tests**: Tests with inconsistent results

### Reporting

- **Daily**: Test execution reports in CI/CD
- **Weekly**: Coverage trend analysis
- **Monthly**: Test effectiveness review
- **Quarterly**: Test strategy optimization

---

**Document Control**

- **Version**: 1.0
- **Last Updated**: October 18, 2025
- **Next Review**: November 18, 2025
- **Approved By**: QA Team Lead
