# Finance Manager Dashboard API Contracts

This document defines the REST contracts for the Finance Manager Dashboard backend services described in `docs/architecture.md` and implements backlog task "Define API contracts (REST/GraphQL) for each service including request/response schemas and validation rules."

## Conventions

- Base path: `/api` behind the API Gateway; service-specific segments (for example `/auth`, `/transactions`) map to individual microservices.
- All requests and responses use JSON (`Content-Type: application/json`) unless noted otherwise.
- Authentication: Authenticated routes require the gateway session cookie `fm_session` plus an `Authorization: Bearer <accessToken>` header. Access tokens are short-lived JWTs signed by the Auth service; refresh tokens live in HTTP-only `fm_refresh` cookies.
- Timestamps use ISO 8601 in UTC (`2025-09-15T20:12:45Z`).
- Monetary amounts are strings with exact decimal precision; clients convert to decimal types (`"124.53"`).
- Identifiers are UUID v7 strings unless specified.
- Idempotency: Mutating POST endpoints that might be retried accept an `Idempotency-Key` header (UUID). Duplicate keys within 24 hours return the original response.

### Response Envelope

```
Success:
{
  "data": {...},
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 120,
    "hasNextPage": true
  }
}

Error:
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Email or password is incorrect.",
    "details": {...}
  },
  "correlationId": "a9d6f1bd9e17451b82f1c7e1a8b55c02"
}
```

- `meta` is optional; omit when not relevant.
- `correlationId` mirrors the OpenTelemetry trace ID and must be returned on all error responses.

### Validation

- Schemas in this document use Zod syntax (`z.object({ ... })`). The same schema lives in shared packages for gateway and frontend validation.
- Strings are trimmed by the gateway before validation.
- Enum values map to the domain definitions captured in `docs/domain-model.md`.

### Pagination and Filtering

- Standard query parameters: `page` (1-based), `pageSize` (default 25, max 100), `sort` (comma-separated `field:direction`), and `filter[...]` for complex filters.
- Date filters use ISO 8601 strings (`from`, `to`, `startDate`, `endDate`).

### Security Controls

- CSRF: Browser-based POST/PUT/PATCH/DELETE requests must send `X-CSRF-Token` matching the `fm_csrf` cookie.
- Rate limiting: Gateway enforces per-IP and per-user limits. HTTP 429 responses include `Retry-After` and error code `RATE_LIMIT_EXCEEDED`.
- Internal-only endpoints require a service token header `X-Service-Authorization`.

## Service Contracts
### Auth and Security Service

Handles user registration, session lifecycle management, MFA, and password maintenance.

#### POST /api/auth/signup
- **Purpose**: Register a new user account and enqueue the verification email.
- **Auth**: Public
- **Headers**: `Content-Type: application/json`, optional `Idempotency-Key`.

**Request Body**
```json
{
  "email": "casey@example.com",
  "password": "Sup3rSecurePass!",
  "firstName": "Casey",
  "lastName": "Patel",
  "planTier": "free",
  "acceptTerms": true,
  "marketingOptIn": false,
  "timezone": "America/New_York"
}
```

**Validation (Zod)**
```ts
const passwordSchema = z.string()
  .min(12)
  .max(128)
  .regex(/[A-Z]/, "Must include uppercase")
  .regex(/[a-z]/, "Must include lowercase")
  .regex(/[0-9]/, "Must include digit")
  .regex(/[^A-Za-z0-9]/, "Must include symbol");

const SignupRequest = z.object({
  email: z.string().email().max(254),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  planTier: z.enum(["free", "pro", "family"]).default("free"),
  acceptTerms: z.literal(true),
  marketingOptIn: z.boolean().optional(),
  timezone: z.string().min(1).max(64).optional()
});
```

**Responses**
- `201 Created`
```json
{
  "data": {
    "user": {
      "id": "018f5c27-55c6-7b2c-9e14-88c6108447fb",
      "email": "casey@example.com",
      "planTier": "free",
      "emailVerified": false
    },
    "requiresEmailVerification": true
  },
  "meta": {}
}
```
  - Headers: `Set-Cookie: fm_refresh=...; HttpOnly; Secure; SameSite=Lax`, `Set-Cookie: fm_session=...`.

**Errors**
- `409` `AUTH_EMAIL_EXISTS` when the email is already registered.
- `400` `VALIDATION_ERROR` with per-field `details`.
- `503` `AUTH_PROVIDER_UNAVAILABLE` when mail service fails.

#### POST /api/auth/login
- **Purpose**: Authenticate with email/password and issue session tokens.
- **Auth**: Public
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "email": "casey@example.com",
  "password": "Sup3rSecurePass!",
  "rememberMe": true,
  "challengeId": "f503b2c9-7c2c-4994-9cb5-2d9e0f7d4240",
  "mfaCode": "123456"
}
```

**Validation (Zod)**
```ts
const LoginRequest = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  rememberMe: z.boolean().default(false),
  challengeId: z.string().uuid().optional(),
  mfaCode: z.string().regex(/^[0-9]{6}$/).optional()
}).refine(
  data => !data.mfaCode || !!data.challengeId,
  { message: "challengeId required when mfaCode supplied", path: ["challengeId"] }
);
```

**Responses**
- `200 OK` (authenticated)
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "refreshExpiresIn": 2592000,
    "user": {
      "id": "018f5c27-55c6-7b2c-9e14-88c6108447fb",
      "email": "casey@example.com",
      "planTier": "free",
      "roles": ["owner"],
      "mfaEnabled": true,
      "lastLoginAt": "2025-09-15T19:58:21Z"
    }
  },
  "meta": {
    "mfaRequired": false
  }
}
```
  - Headers: `Set-Cookie: fm_session=...; HttpOnly; Secure`, `Set-Cookie: fm_refresh=...; HttpOnly; Secure; SameSite=Lax`.

- `200 OK` (MFA challenge required)
```json
{
  "data": {
    "challengeId": "f503b2c9-7c2c-4994-9cb5-2d9e0f7d4240",
    "mfaMethods": ["totp", "backup_code"]
  },
  "meta": {
    "mfaRequired": true
  }
}
```

**Errors**
- `401` `AUTH_INVALID_CREDENTIALS` when password mismatch.
- `423` `AUTH_ACCOUNT_LOCKED` after repeated failures.
- `412` `AUTH_EMAIL_NOT_VERIFIED` when verification is outstanding.
- `429` `RATE_LIMIT_EXCEEDED` when login throttled.

#### POST /api/auth/refresh
- **Purpose**: Rotate the access token using the refresh cookie.
- **Auth**: Requires `fm_refresh` cookie
- **Headers**: `Content-Type: application/json`, `Cookie: fm_refresh=...`, browser requests also send `X-CSRF-Token`.

**Request Body**
```json
{
  "sessionFingerprint": "device-3e32adc67b"
}
```

**Validation (Zod)**
```ts
const RefreshRequest = z.object({
  sessionFingerprint: z.string().min(8).max(128).optional()
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "meta": {}
}
```
  - Headers: `Set-Cookie: fm_session=...; HttpOnly; Secure`.

**Errors**
- `401` `AUTH_REFRESH_EXPIRED` when token invalid or revoked.
- `400` `AUTH_SESSION_MISMATCH` if fingerprint does not match stored session hash.

#### POST /api/auth/logout
- **Purpose**: Revoke refresh token and clear cookies.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`, `Cookie`.

**Request Body**
```json
{}
```

**Validation (Zod)**
```ts
const LogoutRequest = z.object({}).strict();
```

**Responses**
- `204 No Content`
  - Headers: `Set-Cookie: fm_session=; Max-Age=0`, `Set-Cookie: fm_refresh=; Max-Age=0`.

**Errors**
- `401` `AUTH_UNAUTHENTICATED` when session missing.

#### POST /api/auth/password/reset-request
- **Purpose**: Send password reset email with verification token.
- **Auth**: Public
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "email": "casey@example.com",
  "redirectUri": "https://app.financemanager.com/reset"
}
```

**Validation (Zod)**
```ts
const ResetRequest = z.object({
  email: z.string().email().max(254),
  redirectUri: z.string().url().max(2048)
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "message": "If the email exists, a reset link has been sent."
  }
}
```

**Errors**
- `429` `AUTH_TOO_MANY_RESET_REQUESTS` when throttled.

#### POST /api/auth/password/reset
- **Purpose**: Update password using a valid reset token.
- **Auth**: Public (token gated)
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "token": "5c9f3aa4-7f2d-4b7e-b8d8-5bbce6b947ea",
  "password": "NewSup3rSecurePass!"
}
```

**Validation (Zod)**
```ts
const PasswordReset = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "message": "Password updated."
  }
}
```

**Errors**
- `400` `AUTH_RESET_TOKEN_INVALID`
- `410` `AUTH_RESET_TOKEN_EXPIRED`

#### POST /api/auth/mfa/setup
- **Purpose**: Initialize TOTP MFA enrollment for the current user.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "method": "totp",
  "deviceName": "Personal phone"
}
```

**Validation (Zod)**
```ts
const MfaSetupRequest = z.object({
  method: z.enum(["totp"]),
  deviceName: z.string().min(1).max(100).optional()
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "challengeId": "7815c003-235c-4cbe-9f63-3e60e3df1d21",
    "totp": {
      "secret": "JBSWY3DPEHPK3PXP",
      "otpauthUrl": "otpauth://totp/FinanceManager:casey%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=FinanceManager",
      "qrCodeSvg": "<svg>...</svg>"
    }
  }
}
```

**Errors**
- `409` `AUTH_MFA_ALREADY_ENABLED` when MFA already active.
- `400` `VALIDATION_ERROR` if method unsupported.

#### POST /api/auth/mfa/verify
- **Purpose**: Confirm MFA challenge and activate device or complete login.
- **Auth**: Requires authenticated session or prior login challenge
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "challengeId": "7815c003-235c-4cbe-9f63-3e60e3df1d21",
  "code": "123456",
  "rememberDevice": true
}
```

**Validation (Zod)**
```ts
const MfaVerifyRequest = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^[0-9]{6}$/),
  rememberDevice: z.boolean().default(false)
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "mfaEnabled": true,
    "backupCodes": [
      "BD7H-3K9P",
      "MP4Z-L2QS",
      "Z8NC-6T1W",
      "Q5RM-B0JY",
      "H2XD-8VEK"
    ]
  },
  "meta": {
    "rememberedUntil": "2025-10-15T20:00:00Z"
  }
}
```

**Errors**
- `400` `AUTH_MFA_CHALLENGE_INVALID`
- `401` `AUTH_MFA_CODE_INCORRECT`
- `410` `AUTH_MFA_CHALLENGE_EXPIRED`
### User Profile Service

Maintains profile metadata, personal preferences, and dashboard layout settings.

#### GET /api/profile
- **Purpose**: Retrieve the authenticated user's profile details.
- **Auth**: Requires authenticated session

**Query Parameters**: none

**Responses**
- `200 OK`
```json
{
  "data": {
    "profile": {
      "userId": "018f5c27-55c6-7b2c-9e14-88c6108447fb",
      "firstName": "Casey",
      "lastName": "Patel",
      "email": "casey@example.com",
      "phone": "+12025550123",
      "timezone": "America/New_York",
      "createdAt": "2025-04-01T15:33:12Z",
      "updatedAt": "2025-09-15T19:30:54Z"
    }
  }
}
```

#### PUT /api/profile
- **Purpose**: Update profile metadata.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "firstName": "Casey",
  "lastName": "Patel",
  "phone": "+12025550123",
  "timezone": "America/New_York"
}
```

**Validation (Zod)**
```ts
const ProfileUpdate = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/).nullable().optional(),
  timezone: z.string().min(1).max(64)
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "profile": {
      "userId": "018f5c27-55c6-7b2c-9e14-88c6108447fb",
      "firstName": "Casey",
      "lastName": "Patel",
      "phone": "+12025550123",
      "timezone": "America/New_York",
      "updatedAt": "2025-09-15T20:03:50Z"
    }
  }
}
```

**Errors**
- `400` `VALIDATION_ERROR` for malformed phone numbers.

#### GET /api/profile/preferences
- **Purpose**: Retrieve UI, notification, and AI assistant preferences.
- **Auth**: Requires authenticated session

**Responses**
- `200 OK`
```json
{
  "data": {
    "preferences": {
      "theme": "system",
      "aiAssistantOptIn": true,
      "language": "en-US",
      "currency": "USD",
      "notificationChannels": {
        "email": true,
        "sms": false,
        "push": true,
        "inApp": true
      },
      "digestSchedule": "weekly",
      "featureFlags": {
        "betaGoals": true
      }
    }
  }
}
```

#### PUT /api/profile/preferences
- **Purpose**: Update preference options.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "theme": "dark",
  "aiAssistantOptIn": true,
  "language": "en-US",
  "currency": "USD",
  "notificationChannels": {
    "email": true,
    "sms": false,
    "push": true,
    "inApp": true
  },
  "digestSchedule": "weekly"
}
```

**Validation (Zod)**
```ts
const PreferencesUpdate = z.object({
  theme: z.enum(["light", "dark", "system"]),
  aiAssistantOptIn: z.boolean(),
  language: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
  currency: z.string().length(3),
  notificationChannels: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean()
  }),
  digestSchedule: z.enum(["daily", "weekly", "monthly", "never"])
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "preferences": {
      "theme": "dark",
      "aiAssistantOptIn": true,
      "language": "en-US",
      "currency": "USD",
      "notificationChannels": {
        "email": true,
        "sms": false,
        "push": true,
        "inApp": true
      },
      "digestSchedule": "weekly"
    }
  }
}
```

#### PUT /api/profile/widgets
- **Purpose**: Persist drag-and-drop dashboard layout.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "layout": [
    {
      "widgetId": "cashFlow",
      "x": 0,
      "y": 0,
      "w": 6,
      "h": 3,
      "minW": 3,
      "minH": 2
    },
    {
      "widgetId": "spendingByCategory",
      "x": 6,
      "y": 0,
      "w": 6,
      "h": 3,
      "minW": 4,
      "minH": 2
    }
  ],
  "breakpoint": "desktop"
}
```

**Validation (Zod)**
```ts
const WidgetLayoutItem = z.object({
  widgetId: z.string().min(1).max(64),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(12),
  minW: z.number().int().min(1).max(12).optional(),
  minH: z.number().int().min(1).max(12).optional()
});

const WidgetLayoutUpdate = z.object({
  layout: z.array(WidgetLayoutItem).min(1),
  breakpoint: z.enum(["mobile", "tablet", "desktop"])
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "layout": [
      {
        "widgetId": "cashFlow",
        "x": 0,
        "y": 0,
        "w": 6,
        "h": 3
      }
    ]
  }
}
```

**Errors**
- `409` `PROFILE_WIDGET_CONFLICT` when layout overlaps detected.
### Accounts Service

Manages Plaid link exchanges, account metadata, and balance snapshots.

#### POST /api/accounts/link
- **Purpose**: Exchange a Plaid public token and persist newly linked accounts.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`, `Idempotency-Key` recommended for retries.

**Request Body**
```json
{
  "publicToken": "public-sandbox-12345",
  "institutionId": "ins_109511",
  "metadata": {
    "institutionName": "Chase",
    "linkSessionId": "0cd0b6cf-6ea0-4a94-9b6a-87f4ade8b4e7",
    "accounts": [
      {
        "id": "EXTERNAL_ACCOUNT_ID",
        "name": "Checking",
        "mask": "6789",
        "type": "depository",
        "subtype": "checking"
      }
    ]
  }
}
```

**Validation (Zod)**
```ts
const AccountsLinkRequest = z.object({
  publicToken: z.string().min(1).max(256),
  institutionId: z.string().min(1).max(128),
  metadata: z.object({
    institutionName: z.string().min(1).max(128),
    linkSessionId: z.string().uuid(),
    accounts: z.array(z.object({
      id: z.string().min(1).max(128),
      name: z.string().min(1).max(128),
      mask: z.string().regex(/^\d{2,4}$/),
      type: z.string().min(1).max(64),
      subtype: z.string().min(1).max(64)
    })).min(1)
  })
});
```

**Responses**
- `201 Created`
```json
{
  "data": {
    "linkedAccounts": [
      {
        "id": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca",
        "institutionName": "Chase",
        "accountName": "Everyday Checking",
        "accountType": "checking",
        "mask": "6789",
        "currency": "USD",
        "currentBalance": "2450.32",
        "status": "active",
        "createdAt": "2025-09-15T20:10:52Z"
      }
    ]
  },
  "meta": {
    "nextPlaidUpdateWebhook": "https://api.financemanager.com/webhooks/plaid"
  }
}
```

**Errors**
- `400` `ACCOUNTS_LINK_METADATA_INVALID` when Plaid metadata missing.
- `502` `PLAID_EXCHANGE_FAILED` when token exchange fails.

#### GET /api/accounts
- **Purpose**: List accounts for the authenticated user.
- **Auth**: Requires authenticated session

**Query Parameters**
- `status` (`active|archived`) optional
- `includeSnapshots` (`true|false`) optional
- `search` optional substring that matches institution or account name

**Responses**
- `200 OK`
```json
{
  "data": {
    "accounts": [
      {
        "id": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca",
        "institutionName": "Chase",
        "accountName": "Everyday Checking",
        "accountType": "checking",
        "mask": "6789",
        "currency": "USD",
        "currentBalance": "2450.32",
        "availableBalance": "2200.00",
        "status": "active",
        "lastSyncedAt": "2025-09-15T18:55:03Z",
        "snapshots": [
          {
            "capturedAt": "2025-09-14T00:00:00Z",
            "currentBalance": "2380.11",
            "availableBalance": "2200.00"
          }
        ]
      }
    ]
  },
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 3,
    "hasNextPage": false
  }
}
```

#### PATCH /api/accounts/:accountId
- **Purpose**: Update mutable account attributes.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "accountName": "Family Checking",
  "status": "archived",
  "notes": "Closed after moving banks"
}
```

**Validation (Zod)**
```ts
const AccountUpdate = z.object({
  accountName: z.string().min(1).max(128).optional(),
  status: z.enum(["active", "archived"]).optional(),
  notes: z.string().max(500).optional()
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "account": {
      "id": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca",
      "accountName": "Family Checking",
      "status": "archived",
      "notes": "Closed after moving banks",
      "updatedAt": "2025-09-15T20:12:30Z"
    }
  }
}
```

**Errors**
- `404` `ACCOUNTS_NOT_FOUND` when accountId unknown.

#### DELETE /api/accounts/:accountId
- **Purpose**: Unlink an account while honoring data retention requirements.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "retention": "keep_transactions",
  "reason": "switched_bank"
}
```

**Validation (Zod)**
```ts
const AccountDelete = z.object({
  retention: z.enum(["keep_transactions", "purge_after_30_days"]),
  reason: z.enum(["user_request", "switched_bank", "fraud_suspected", "other"]).optional()
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "accountId": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca",
    "status": "pending_unlink",
    "scheduledPurgeAt": "2025-10-15T20:12:30Z"
  }
}
```

**Errors**
- `409` `ACCOUNTS_ACTIVE_BILLS` when bills still reference the account.
### Transactions Service

Provides transaction ingestion, categorization, and editing capabilities.

#### GET /api/transactions
- **Purpose**: Retrieve paginated transactions with filtering and sorting.
- **Auth**: Requires authenticated session

**Query Parameters**
- `page`, `pageSize`
- `sort` (default `postedAt:desc`)
- `filter[accountId]`
- `filter[categoryId]`
- `filter[direction]` (`credit|debit`)
- `filter[source]` (`plaid|import|manual`)
- `filter[status]` (`pending|cleared|disputed`)
- `filter[minAmount]`, `filter[maxAmount]`
- `filter[from]`, `filter[to]` (ISO timestamps)
- `search` (matches merchant or description)

**Responses**
- `200 OK`
```json
{
  "data": {
    "transactions": [
      {
        "id": "523c0a5f-b737-4c8b-8945-6c82c3f8471d",
        "accountId": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca",
        "userId": "018f5c27-55c6-7b2c-9e14-88c6108447fb",
        "postedAt": "2025-09-14T12:30:00Z",
        "amount": "45.28",
        "direction": "debit",
        "merchantName": "Blue Bottle Coffee",
        "description": "BLUE BOTTLE #123",
        "categoryId": "cat-coffee",
        "tags": ["coffee", "treat"],
        "status": "cleared",
        "source": "plaid",
        "receiptUrl": null,
        "createdAt": "2025-09-14T12:35:22Z",
        "updatedAt": "2025-09-15T18:02:11Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 142,
    "hasNextPage": true
  }
}
```

#### POST /api/transactions/import
- **Purpose**: Submit a CSV import that will be processed asynchronously.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`, `Idempotency-Key` required for retries.

**Request Body**
```json
{
  "uploadId": "f4ce8d2c-b14a-4437-9c22-6fb23a10ae8d",
  "accountId": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca",
  "fileName": "checking-july.csv",
  "hasHeaderRow": true,
  "columnMapping": {
    "date": "Transaction Date",
    "description": "Description",
    "amount": "Amount",
    "direction": "Type"
  }
}
```

**Validation (Zod)**
```ts
const TransactionImportRequest = z.object({
  uploadId: z.string().uuid(),
  accountId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  hasHeaderRow: z.boolean().default(true),
  columnMapping: z.object({
    date: z.string().min(1),
    description: z.string().min(1),
    amount: z.string().min(1),
    direction: z.string().min(1),
    category: z.string().min(1).optional(),
    notes: z.string().min(1).optional()
  })
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "importJobId": "e6988d2f-8f41-4887-b64a-0a9ad8b9bc63",
    "status": "queued",
    "estimatedCompletionSeconds": 45
  }
}
```

**Errors**
- `409` `TRANSACTIONS_IMPORT_DUPLICATE` when file already processed.
- `400` `TRANSACTIONS_IMPORT_COLUMNS_INVALID`.

#### PATCH /api/transactions/:id
- **Purpose**: Update category, notes, tags, or status.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "categoryId": "cat-groceries",
  "notes": "Weekly grocery run",
  "tags": ["groceries", "family"],
  "status": "cleared"
}
```

**Validation (Zod)**
```ts
const TransactionUpdate = z.object({
  categoryId: z.string().min(1).max(64).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  tags: z.array(z.string().min(1).max(32)).max(20).optional(),
  status: z.enum(["pending", "cleared", "disputed"]).optional()
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "transaction": {
      "id": "523c0a5f-b737-4c8b-8945-6c82c3f8471d",
      "categoryId": "cat-groceries",
      "notes": "Weekly grocery run",
      "tags": ["groceries", "family"],
      "status": "cleared",
      "updatedAt": "2025-09-15T20:15:44Z"
    }
  }
}
```

**Errors**
- `404` `TRANSACTIONS_NOT_FOUND`
- `409` `TRANSACTIONS_STATUS_IMMUTABLE` when disputed transactions cannot change.

#### POST /api/transactions/bulk-tag
- **Purpose**: Apply tag or category updates to multiple transactions.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "transactionIds": [
    "523c0a5f-b737-4c8b-8945-6c82c3f8471d",
    "cd55d3d5-1129-43d6-af12-9a311c694cb2"
  ],
  "addTags": ["recurring"],
  "removeTags": ["manual-review"],
  "categoryId": "cat-subscriptions",
  "replaceTags": false
}
```

**Validation (Zod)**
```ts
const BulkTagRequest = z.object({
  transactionIds: z.array(z.string().uuid()).min(1).max(200),
  addTags: z.array(z.string().min(1).max(32)).max(20).optional(),
  removeTags: z.array(z.string().min(1).max(32)).max(20).optional(),
  categoryId: z.string().min(1).max(64).nullable().optional(),
  replaceTags: z.boolean().default(false)
}).refine(data => data.addTags?.length || data.removeTags?.length || data.categoryId, {
  message: "Must supply at least addTags, removeTags, or categoryId",
  path: ["addTags"]
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "updatedCount": 2,
    "failedIds": []
  }
}
```

**Errors**
- `400` `TRANSACTIONS_BULK_TOO_LARGE` when more than 200 ids submitted.
### Budget Service

Tracks user budgets, allocations, and monthly variance calculations.

#### GET /api/budgets
- **Purpose**: Retrieve all budgets with optional KPI projections.
- **Auth**: Requires authenticated session

**Query Parameters**
- `period` (`monthly|weekly|custom`) optional
- `includePerformance=true|false` to include spending progress
- `status` (`active|archived`) optional

**Responses**
- `200 OK`
```json
{
  "data": {
    "budgets": [
      {
        "id": "8b9d6a9e-3e24-4bf8-90d5-bf3c91ec0d6d",
        "name": "Household Essentials",
        "period": "monthly",
        "startDate": "2025-09-01",
        "endDate": "2025-09-30",
        "targetAmount": "1200.00",
        "rolloverEnabled": true,
        "alertsEnabled": true,
        "status": "active",
        "performance": {
          "spent": "640.55",
          "remaining": "559.45",
          "projectedEnd": "1180.00"
        }
      }
    ]
  },
  "meta": {}
}
```

#### POST /api/budgets
- **Purpose**: Create a new budget with category allocations.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "name": "Household Essentials",
  "period": "monthly",
  "startDate": "2025-09-01",
  "targetAmount": "1200.00",
  "rolloverEnabled": true,
  "alertsEnabled": true,
  "categories": [
    {
      "categoryId": "cat-groceries",
      "allocatedAmount": "800.00",
      "alertThresholdPercent": 80
    },
    {
      "categoryId": "cat-utilities",
      "allocatedAmount": "400.00",
      "alertThresholdPercent": 90
    }
  ]
}
```

**Validation (Zod)**
```ts
const BudgetCategoryInput = z.object({
  categoryId: z.string().min(1).max(64),
  allocatedAmount: z.string().regex(/^\d+(\.\d{2})?$/),
  alertThresholdPercent: z.number().int().min(50).max(150).optional()
});

const BudgetCreate = z.object({
  name: z.string().min(1).max(120),
  period: z.enum(["monthly", "weekly", "custom"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{2})?$/),
  rolloverEnabled: z.boolean().default(false),
  alertsEnabled: z.boolean().default(true),
  categories: z.array(BudgetCategoryInput).min(1)
}).refine(
  data => data.period !== "custom" || !!data.endDate,
  { message: "endDate required for custom period", path: ["endDate"] }
);
```

**Responses**
- `201 Created`
```json
{
  "data": {
    "budget": {
      "id": "8b9d6a9e-3e24-4bf8-90d5-bf3c91ec0d6d",
      "name": "Household Essentials",
      "period": "monthly",
      "startDate": "2025-09-01",
      "targetAmount": "1200.00",
      "rolloverEnabled": true,
      "alertsEnabled": true,
      "categories": [
        {
          "categoryId": "cat-groceries",
          "allocatedAmount": "800.00",
          "alertThresholdPercent": 80
        }
      ]
    }
  }
}
```

**Errors**
- `409` `BUDGET_DUPLICATE_NAME` within same period.

#### PATCH /api/budgets/:id
- **Purpose**: Modify budget allocations or thresholds.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "name": "Household Essentials + Pets",
  "rolloverEnabled": false,
  "categories": [
    {
      "categoryId": "cat-pets",
      "allocatedAmount": "120.00",
      "alertThresholdPercent": 75
    }
  ]
}
```

**Validation (Zod)**
```ts
const BudgetUpdate = z.object({
  name: z.string().min(1).max(120).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  rolloverEnabled: z.boolean().optional(),
  alertsEnabled: z.boolean().optional(),
  categories: z.array(BudgetCategoryInput).min(1).optional()
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "budget": {
      "id": "8b9d6a9e-3e24-4bf8-90d5-bf3c91ec0d6d",
      "name": "Household Essentials + Pets",
      "rolloverEnabled": false,
      "categories": [
        {
          "categoryId": "cat-groceries",
          "allocatedAmount": "800.00",
          "alertThresholdPercent": 80
        },
        {
          "categoryId": "cat-pets",
          "allocatedAmount": "120.00",
          "alertThresholdPercent": 75
        }
      ]
    }
  }
}
```

**Errors**
- `404` `BUDGET_NOT_FOUND`
- `409` `BUDGET_ROLLOVER_LOCKED` when closing period.

#### GET /api/budgets/:id/summary
- **Purpose**: Provide month-to-date variance, rollover amounts, and AI recommendations.
- **Auth**: Requires authenticated session

**Responses**
- `200 OK`
```json
{
  "data": {
    "summary": {
      "budgetId": "8b9d6a9e-3e24-4bf8-90d5-bf3c91ec0d6d",
      "periodStart": "2025-09-01",
      "periodEnd": "2025-09-30",
      "target": "1200.00",
      "spent": "640.55",
      "remaining": "559.45",
      "rolloverFromLastPeriod": "120.22",
      "variancePercent": -5.1,
      "alerts": [
        {
          "type": "threshold",
          "categoryId": "cat-groceries",
          "message": "Groceries spending is at 80% of allocation."
        }
      ],
      "recommendations": [
        {
          "id": "rec-123",
          "title": "Schedule a bulk purchase reminder",
          "actionUrl": "/dashboard/budgets"
        }
      ]
    }
  }
}
```

**Errors**
- `404` `BUDGET_NOT_FOUND`
### Goals Service

Manages financial goals, contributions, and AI-based recommendations.

#### POST /api/goals
- **Purpose**: Create a new savings or payoff goal.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "name": "Emergency Fund",
  "targetAmount": "10000.00",
  "currentAmount": "2500.00",
  "targetDate": "2026-03-01",
  "category": "savings",
  "priority": "high",
  "linkedAccountId": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca"
}
```

**Validation (Zod)**
```ts
const GoalCreate = z.object({
  name: z.string().min(1).max(120),
  targetAmount: z.string().regex(/^\d+(\.\d{2})?$/),
  currentAmount: z.string().regex(/^\d+(\.\d{2})?$/).default("0.00"),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1).max(64),
  priority: z.enum(["low", "medium", "high"]),
  linkedAccountId: z.string().uuid().optional()
}).refine(
  data => parseFloat(data.currentAmount) <= parseFloat(data.targetAmount),
  { message: "currentAmount cannot exceed targetAmount", path: ["currentAmount"] }
);
```

**Responses**
- `201 Created`
```json
{
  "data": {
    "goal": {
      "id": "e1f572a8-7bf8-4435-8d62-61c92dfd6f81",
      "name": "Emergency Fund",
      "targetAmount": "10000.00",
      "currentAmount": "2500.00",
      "targetDate": "2026-03-01",
      "category": "savings",
      "priority": "high",
      "progressPercent": 25,
      "status": "in_progress"
    }
  }
}
```

**Errors**
- `409` `GOAL_DUPLICATE_NAME` when name already used.

#### GET /api/goals
- **Purpose**: List goals with progress metrics.
- **Auth**: Requires authenticated session

**Query Parameters**
- `status` (`in_progress|completed|archived`) optional
- `category` optional

**Responses**
- `200 OK`
```json
{
  "data": {
    "goals": [
      {
        "id": "e1f572a8-7bf8-4435-8d62-61c92dfd6f81",
        "name": "Emergency Fund",
        "targetAmount": "10000.00",
        "currentAmount": "2600.00",
        "targetDate": "2026-03-01",
        "progressPercent": 26,
        "status": "in_progress",
        "aiRecommendationStatus": "idle"
      }
    ]
  },
  "meta": {}
}
```

#### PATCH /api/goals/:id
- **Purpose**: Modify goal amount, dates, or priority.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "currentAmount": "3000.00",
  "targetDate": "2026-01-01",
  "priority": "medium"
}
```

**Validation (Zod)**
```ts
const GoalUpdate = z.object({
  name: z.string().min(1).max(120).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  currentAmount: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["in_progress", "completed", "archived"]).optional()
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "goal": {
      "id": "e1f572a8-7bf8-4435-8d62-61c92dfd6f81",
      "currentAmount": "3000.00",
      "targetDate": "2026-01-01",
      "priority": "medium",
      "status": "in_progress",
      "progressPercent": 30
    }
  }
}
```

**Errors**
- `404` `GOAL_NOT_FOUND`

#### POST /api/goals/:id/recommendation
- **Purpose**: Request an AI-generated plan improvement for the goal.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "currentFocus": "reduce dining out by 15%",
  "questions": [
    "Can I automate transfers after each paycheck?"
  ]
}
```

**Validation (Zod)**
```ts
const GoalRecommendationRequest = z.object({
  currentFocus: z.string().min(1).max(280).optional(),
  questions: z.array(z.string().min(1).max(280)).max(5).optional()
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "goalId": "e1f572a8-7bf8-4435-8d62-61c92dfd6f81",
    "insightId": "ins-0f8fa3c1",
    "status": "queued"
  }
}
```

**Errors**
- `409` `GOAL_RECOMMENDATION_IN_PROGRESS` when prior request active.
### Bills and Reminders Service

Handles recurring bills, subscriptions, and delivery of reminder schedules.

#### POST /api/bills
- **Purpose**: Create a bill or subscription entry with scheduling metadata.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "name": "Rent",
  "amountDue": "1800.00",
  "dueDate": "2025-10-01",
  "frequency": "monthly",
  "autoPayEnabled": true,
  "accountId": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca",
  "categoryId": "cat-housing",
  "reminderLeadDays": [7, 3, 1],
  "notes": "Landlord accepts ACH only"
}
```

**Validation (Zod)**
```ts
const BillCreate = z.object({
  name: z.string().min(1).max(120),
  amountDue: z.string().regex(/^\d+(\.\d{2})?$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frequency: z.enum(["monthly", "quarterly", "annual", "custom"]),
  customScheduleCron: z.string().max(120).optional(),
  autoPayEnabled: z.boolean().default(false),
  accountId: z.string().uuid().nullable(),
  categoryId: z.string().min(1).max(64).nullable().optional(),
  reminderLeadDays: z.array(z.number().int().min(0).max(30)).max(6).default([3]),
  notes: z.string().max(500).optional()
}).refine(
  data => data.frequency !== "custom" || !!data.customScheduleCron,
  { message: "customScheduleCron required for custom frequency", path: ["customScheduleCron"] }
);
```

**Responses**
- `201 Created`
```json
{
  "data": {
    "bill": {
      "id": "94f20c31-cbd3-4eaa-bc50-8a256cbfc35b",
      "name": "Rent",
      "amountDue": "1800.00",
      "dueDate": "2025-10-01",
      "frequency": "monthly",
      "autoPayEnabled": true,
      "status": "upcoming"
    }
  }
}
```

**Errors**
- `409` `BILL_DUPLICATE_NAME` for same due date.

#### GET /api/bills
- **Purpose**: List bills with upcoming reminders.
- **Auth**: Requires authenticated session

**Query Parameters**
- `status` (`upcoming|paid|overdue`) optional
- `dueFrom`, `dueTo` (ISO date)
- `includeReminders=true|false`

**Responses**
- `200 OK`
```json
{
  "data": {
    "bills": [
      {
        "id": "94f20c31-cbd3-4eaa-bc50-8a256cbfc35b",
        "name": "Rent",
        "amountDue": "1800.00",
        "dueDate": "2025-10-01",
        "frequency": "monthly",
        "autoPayEnabled": true,
        "status": "upcoming",
        "nextReminder": {
          "scheduledFor": "2025-09-24T14:00:00Z",
          "channels": ["email", "push"]
        }
      }
    ]
  },
  "meta": {}
}
```

#### PATCH /api/bills/:id
- **Purpose**: Update bill scheduling, amount, or auto pay.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "amountDue": "1825.00",
  "dueDate": "2025-10-02",
  "autoPayEnabled": false,
  "reminderLeadDays": [5, 2]
}
```

**Validation (Zod)**
```ts
const BillUpdate = z.object({
  name: z.string().min(1).max(120).optional(),
  amountDue: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  autoPayEnabled: z.boolean().optional(),
  reminderLeadDays: z.array(z.number().int().min(0).max(30)).max(6).optional(),
  status: z.enum(["upcoming", "paid", "overdue"]).optional()
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "bill": {
      "id": "94f20c31-cbd3-4eaa-bc50-8a256cbfc35b",
      "amountDue": "1825.00",
      "dueDate": "2025-10-02",
      "autoPayEnabled": false,
      "reminderLeadDays": [5, 2]
    }
  }
}
```

**Errors**
- `404` `BILL_NOT_FOUND`

#### POST /api/bills/:id/mark-paid
- **Purpose**: Mark a bill as paid and optionally link the payment transaction.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "paidAt": "2025-09-30T15:00:00Z",
  "transactionId": "523c0a5f-b737-4c8b-8945-6c82c3f8471d",
  "amount": "1825.00",
  "notes": "Paid via ACH"
}
```

**Validation (Zod)**
```ts
const BillMarkPaid = z.object({
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
  transactionId: z.string().uuid().nullable().optional(),
  amount: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  notes: z.string().max(250).optional()
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "bill": {
      "id": "94f20c31-cbd3-4eaa-bc50-8a256cbfc35b",
      "status": "paid",
      "paidAt": "2025-09-30T15:00:00Z",
      "lastPaidTransactionId": "523c0a5f-b737-4c8b-8945-6c82c3f8471d"
    }
  }
}
```

**Errors**
- `409` `BILL_ALREADY_PAID` when status locked.
### Savings Automation Service

Controls scheduled transfer rules for savings automation.

#### POST /api/savings/rules
- **Purpose**: Create a new savings automation rule.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "name": "Payday Sweep",
  "type": "percentage",
  "percentage": 10,
  "sourceAccountId": "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca",
  "destinationAccountId": "8164e83b-53f9-47cb-b6cc-03da3cf4e1c8",
  "scheduleCron": "0 9 1,15 * *",
  "startDate": "2025-10-01",
  "status": "active"
}
```

**Validation (Zod)**
```ts
const SavingsRuleBase = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["fixed", "percentage", "round_up"]),
  amount: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  percentage: z.number().min(1).max(100).optional(),
  roundUpTo: z.number().int().min(1).max(20).optional(),
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  scheduleCron: z.string().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["active", "paused"]).default("active")
}).superRefine((data, ctx) => {
  if (data.type === "fixed" && !data.amount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "amount required for fixed rules" });
  }
  if (data.type === "percentage" && !data.percentage) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["percentage"], message: "percentage required for percentage rules" });
  }
  if (data.type === "round_up" && !data.roundUpTo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roundUpTo"], message: "roundUpTo required for round_up rules" });
  }
});
```

**Responses**
- `201 Created`
```json
{
  "data": {
    "rule": {
      "id": "6bc50f99-6d2f-4a85-91fa-ef72fce08ba0",
      "name": "Payday Sweep",
      "type": "percentage",
      "percentage": 10,
      "status": "active",
      "nextRunAt": "2025-10-01T13:00:00Z"
    }
  }
}
```

**Errors**
- `409` `SAVINGS_RULE_DUPLICATE_NAME` per destination.

#### GET /api/savings/rules
- **Purpose**: List savings rules and their schedules.
- **Auth**: Requires authenticated session

**Query Parameters**
- `status` (`active|paused`) optional

**Responses**
- `200 OK`
```json
{
  "data": {
    "rules": [
      {
        "id": "6bc50f99-6d2f-4a85-91fa-ef72fce08ba0",
        "name": "Payday Sweep",
        "type": "percentage",
        "percentage": 10,
        "status": "active",
        "nextRunAt": "2025-10-01T13:00:00Z",
        "lastRunAt": "2025-09-15T13:00:00Z",
        "lastError": null
      }
    ]
  }
}
```

#### PATCH /api/savings/rules/:id
- **Purpose**: Update rule parameters or pause/resume.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "status": "paused",
  "percentage": 8
}
```

**Validation (Zod)**
```ts
const SavingsRuleUpdate = z.object({
  name: z.string().min(1).max(120).optional(),
  amount: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  percentage: z.number().min(1).max(100).optional(),
  roundUpTo: z.number().int().min(1).max(20).optional(),
  scheduleCron: z.string().min(1).max(120).optional(),
  status: z.enum(["active", "paused"]).optional()
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "rule": {
      "id": "6bc50f99-6d2f-4a85-91fa-ef72fce08ba0",
      "percentage": 8,
      "status": "paused",
      "nextRunAt": null
    }
  }
}
```

**Errors**
- `404` `SAVINGS_RULE_NOT_FOUND`

#### POST /api/savings/rules/:id/run
- **Purpose**: Manually trigger a rule execution.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "dryRun": false,
  "reason": "user_trigger"
}
```

**Validation (Zod)**
```ts
const SavingsRuleRun = z.object({
  dryRun: z.boolean().default(false),
  reason: z.enum(["user_trigger", "support_debug", "automated_retry"]).default("user_trigger")
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "ruleId": "6bc50f99-6d2f-4a85-91fa-ef72fce08ba0",
    "executionId": "run-1bd2f451",
    "status": "queued"
  }
}
```

**Errors**
- `409` `SAVINGS_RULE_DISABLED` when rule paused.
### Notification Service

Delivers omnichannel communications and manages user channel preferences.

#### POST /api/notifications/test
- **Purpose**: Send a preview notification to the current user (admin-only).
- **Auth**: Requires authenticated admin session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "channel": "email",
  "templateId": "budget-threshold",
  "variables": {
    "firstName": "Casey",
    "budgetName": "Dining Out",
    "percentUsed": 92
  }
}
```

**Validation (Zod)**
```ts
const NotificationTestRequest = z.object({
  channel: z.enum(["email", "sms", "push", "in_app"]),
  templateId: z.string().min(1).max(120),
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "deliveryId": "del-8f2f8d1c",
    "status": "queued"
  }
}
```

**Errors**
- `403` `AUTH_FORBIDDEN` when non-admin attempts request.
- `404` `NOTIFICATION_TEMPLATE_NOT_FOUND`.

#### POST /internal/notifications/dispatch
- **Purpose**: Internal API for services to enqueue notifications.
- **Auth**: Requires valid `X-Service-Authorization` header
- **Headers**: `Content-Type: application/json`, `X-Service-Authorization: Bearer <service-token>`

**Request Body**
```json
{
  "userId": "018f5c27-55c6-7b2c-9e14-88c6108447fb",
  "event": "budget.threshold.exceeded",
  "channelOverrides": {
    "email": true,
    "sms": false,
    "push": true
  },
  "payload": {
    "budgetId": "8b9d6a9e-3e24-4bf8-90d5-bf3c91ec0d6d",
    "percentUsed": 92
  }
}
```

**Validation (Zod)**
```ts
const DispatchRequest = z.object({
  userId: z.string().uuid(),
  event: z.string().min(1).max(120),
  channelOverrides: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
    inApp: z.boolean().optional()
  }).optional(),
  payload: z.record(z.any())
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "deliveryId": "del-0b6531b7",
    "status": "queued"
  }
}
```

**Errors**
- `401` `SERVICE_TOKEN_INVALID`
- `403` `SERVICE_TOKEN_SCOPE_MISSING` when token lacks event scope.

#### GET /api/notifications/preferences
- **Purpose**: Retrieve user-controlled notification channel permissions.
- **Auth**: Requires authenticated session

**Responses**
- `200 OK`
```json
{
  "data": {
    "preferences": {
      "email": true,
      "sms": false,
      "push": true,
      "inApp": true,
      "quietHours": {
        "start": "21:00",
        "end": "07:00",
        "timezone": "America/New_York"
      }
    }
  }
}
```

#### PUT /api/notifications/preferences
- **Purpose**: Update channel opt-ins and quiet hours.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "email": true,
  "sms": true,
  "push": true,
  "inApp": true,
  "quietHours": {
    "start": "22:00",
    "end": "06:00",
    "timezone": "America/New_York"
  }
}
```

**Validation (Zod)**
```ts
const QuietHours = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).max(64)
});

const NotificationPreferencesUpdate = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  inApp: z.boolean(),
  quietHours: QuietHours.nullable().optional()
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "preferences": {
      "email": true,
      "sms": true,
      "push": true,
      "inApp": true,
      "quietHours": {
        "start": "22:00",
        "end": "06:00",
        "timezone": "America/New_York"
      }
    }
  }
}
```

**Errors**
- `400` `NOTIFICATION_QUIET_HOURS_INVALID` when `end` earlier than `start`.
### AI Insight Service

Provides conversational assistance, nightly summaries, and recommended actions.

#### POST /api/insights/chat
- **Purpose**: Send a user prompt to the AI assistant and stream the response.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`, `Accept: text/event-stream`

**Request Body**
```json
{
  "sessionId": "ai-6ac7d0d3",
  "message": "How much did I spend on dining out last month?",
  "context": {
    "accountIds": [],
    "budgetIds": ["8b9d6a9e-3e24-4bf8-90d5-bf3c91ec0d6d"]
  }
}
```

**Validation (Zod)**
```ts
const ChatRequest = z.object({
  sessionId: z.string().min(1).max(64).optional(),
  message: z.string().min(1).max(1000),
  context: z.object({
    accountIds: z.array(z.string().uuid()).max(10).optional(),
    budgetIds: z.array(z.string().uuid()).max(10).optional(),
    goalIds: z.array(z.string().uuid()).max(10).optional()
  }).optional()
});
```

**Responses**
- `200 OK` (`Content-Type: text/event-stream`)
```
event: session
data: {"sessionId":"ai-6ac7d0d3","created":true}

event: token
data: {"content":"Your dining out spend in August was $285.40."}

event: recommendation
data: {"insightId":"ins-a93d","title":"Lower dining budget","actionUrl":"/dashboard/budgets"}

event: done
data: {}
```

**Errors**
- SSE stream ends with `event: error` and HTTP status `409` `AI_SESSION_RATE_LIMITED` when user exceeds concurrency.
- `400` `VALIDATION_ERROR` for overly long message.

#### POST /api/insights/summarize
- **Purpose**: Trigger a summary generation for analytics or nightly digest.
- **Auth**: Requires authenticated session (admin or scheduler service)
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "scope": "daily",
  "date": "2025-09-15",
  "channels": ["dashboard", "email_digest"]
}
```

**Validation (Zod)**
```ts
const SummarizeRequest = z.object({
  scope: z.enum(["daily", "weekly", "monthly"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  channels: z.array(z.enum(["dashboard", "email_digest"])).min(1)
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "summaryId": "sum-0e9d5c12",
    "status": "queued"
  }
}
```

**Errors**
- `409` `AI_SUMMARY_ALREADY_RUNNING`.

#### GET /api/insights/recommendations
- **Purpose**: Fetch latest AI recommended actions for the user.
- **Auth**: Requires authenticated session

**Query Parameters**
- `limit` (max 20, default 10)
- `since` (ISO timestamp) optional
- `includeDismissed` (`true|false`) optional

**Responses**
- `200 OK`
```json
{
  "data": {
    "recommendations": [
      {
        "id": "ins-a93d",
        "title": "Lower dining budget",
        "body": "Spending exceeded the dining budget by 12% last month.",
        "actionUrl": "/dashboard/budgets",
        "createdAt": "2025-09-15T18:00:00Z",
        "status": "new"
      }
    ]
  },
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 3,
    "hasNextPage": false
  }
}
```

**Errors**
- `400` `AI_RECOMMENDATION_CURSOR_INVALID` when `since` can't be parsed.
### Reporting and Export Service

Generates downloadable reports and manages secure share links.

#### POST /api/reports
- **Purpose**: Request generation of a report.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`, `Idempotency-Key` recommended

**Request Body**
```json
{
  "type": "transactions",
  "format": "csv",
  "filters": {
    "from": "2025-08-01",
    "to": "2025-08-31",
    "accountIds": [
      "7e98c5e0-4ffa-4e58-b1a9-a3fa4cbccbca"
    ],
    "categoryIds": [
      "cat-groceries"
    ]
  },
  "delivery": {
    "mode": "download"
  }
}
```

**Validation (Zod)**
```ts
const ReportRequest = z.object({
  type: z.enum(["transactions", "budgets", "cashflow", "tax_summary"]),
  format: z.enum(["csv", "pdf", "xlsx"]),
  filters: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    accountIds: z.array(z.string().uuid()).max(20).optional(),
    categoryIds: z.array(z.string().min(1).max(64)).max(20).optional(),
    goalIds: z.array(z.string().uuid()).max(20).optional()
  }).optional(),
  delivery: z.object({
    mode: z.enum(["download", "email"]),
    email: z.string().email().optional()
  })
}).superRefine((data, ctx) => {
  if (data.delivery.mode === "email" && !data.delivery.email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["delivery", "email"], message: "email required when mode=email" });
  }
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "jobId": "rep-6cba45f1",
    "status": "queued",
    "estimatedCompletionSeconds": 120
  }
}
```

**Errors**
- `409` `REPORT_RATE_LIMITED` when too many open jobs.

#### GET /api/reports/:jobId
- **Purpose**: Check status and retrieve download links.
- **Auth**: Requires authenticated session

**Responses**
- `200 OK`
```json
{
  "data": {
    "jobId": "rep-6cba45f1",
    "status": "ready",
    "downloadUrl": "https://s3.amazonaws.com/financemanager/reports/rep-6cba45f1.csv?signature=...",
    "expiresAt": "2025-09-15T22:30:00Z",
    "requestedAt": "2025-09-15T20:15:00Z",
    "completedAt": "2025-09-15T20:16:45Z"
  }
}
```

**Errors**
- `404` `REPORT_NOT_FOUND`
- `423` `REPORT_STILL_PROCESSING` with `status: "processing"`.

#### POST /api/reports/share
- **Purpose**: Create a time-bound share link for an existing report.
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "jobId": "rep-6cba45f1",
  "expiresInMinutes": 1440,
  "password": null,
  "allowDownload": true
}
```

**Validation (Zod)**
```ts
const ReportShare = z.object({
  jobId: z.string().min(1).max(64),
  expiresInMinutes: z.number().int().min(15).max(10080),
  password: z.string().min(8).max(64).optional().nullable(),
  allowDownload: z.boolean().default(true)
});
```

**Responses**
- `201 Created`
```json
{
  "data": {
    "shareLink": "https://reports.financemanager.com/share/abcd1234",
    "expiresAt": "2025-09-16T20:16:45Z"
  }
}
```

**Errors**
- `409` `REPORT_SHARE_ALREADY_EXISTS`
### Settings and Admin Service

Supports feature flag management, internal analytics, and contextual tip content.

#### GET /api/admin/feature-flags
- **Purpose**: Retrieve the current feature flag configuration.
- **Auth**: Requires authenticated admin session

**Responses**
- `200 OK`
```json
{
  "data": {
    "flags": [
      {
        "key": "insights-beta",
        "description": "Enables new insights panel",
        "enabled": true,
        "rollout": {
          "type": "percentage",
          "value": 25
        },
        "updatedAt": "2025-09-10T17:02:00Z"
      }
    ]
  }
}
```

#### PUT /api/admin/feature-flags
- **Purpose**: Update feature flag rollout.
- **Auth**: Requires authenticated admin session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "flags": [
    {
      "key": "insights-beta",
      "enabled": true,
      "rollout": {
        "type": "percentage",
        "value": 50
      }
    },
    {
      "key": "ai-savings-assistant",
      "enabled": false
    }
  ]
}
```

**Validation (Zod)**
```ts
const Rollout = z.object({
  type: z.enum(["percentage", "userIdList"]),
  value: z.union([z.number().int().min(0).max(100), z.array(z.string().uuid()).max(1000)])
});

const FeatureFlagsUpdate = z.object({
  flags: z.array(z.object({
    key: z.string().min(1).max(64),
    enabled: z.boolean(),
    rollout: Rollout.optional()
  })).min(1)
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "updated": 2
  }
}
```

**Errors**
- `400` `FEATURE_FLAG_ROLLOUT_INVALID` when `value` outside range.

#### GET /api/admin/metrics
- **Purpose**: Provide aggregated KPIs for operations dashboard.
- **Auth**: Requires authenticated admin session

**Query Parameters**
- `range` (`7d|30d|90d`) default `30d`

**Responses**
- `200 OK`
```json
{
  "data": {
    "metrics": {
      "activeUsers": 1842,
      "newAccountsLinked": 426,
      "monthlyRecurringRevenue": "12950.00",
      "messagesToAI": 893,
      "alertsAcknowledged": 512
    }
  }
}
```

**Errors**
- `403` `AUTH_FORBIDDEN` for non-admin.

#### POST /api/admin/content-tips
- **Purpose**: Create or update contextual tips displayed in the UI.
- **Auth**: Requires authenticated admin session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "tipId": "budget-overspend",
  "title": "Watch your dining budget",
  "body": "Use the spending limits feature to stay on target.",
  "cta": {
    "label": "Adjust budgets",
    "url": "/dashboard/budgets"
  },
  "audience": {
    "planTiers": ["free", "pro"],
    "featureFlags": ["insights-beta"]
  },
  "active": true
}
```

**Validation (Zod)**
```ts
const ContentTip = z.object({
  tipId: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  cta: z.object({
    label: z.string().min(1).max(60),
    url: z.string().url()
  }).optional(),
  audience: z.object({
    planTiers: z.array(z.enum(["free", "pro", "family"])).optional(),
    featureFlags: z.array(z.string().min(1).max(64)).optional()
  }).optional(),
  active: z.boolean().default(true)
});
```

**Responses**
- `200 OK`
```json
{
  "data": {
    "tipId": "budget-overspend",
    "updatedAt": "2025-09-15T20:20:30Z"
  }
}
```

**Errors**
- `409` `CONTENT_TIP_CONFLICT` when tip already active for plan.
## API Gateway Aggregation Endpoints

The API Gateway/BFF composes data from multiple services to power high-level dashboard views.

### GET /api/dashboard/overview
- **Purpose**: Provide KPIs for the authenticated user's dashboard landing view.
- **Auth**: Requires authenticated session

**Responses**
- `200 OK`
```json
{
  "data": {
    "kpis": {
      "netWorth": {
        "current": "84562.18",
        "change": "+1240.22",
        "changePercent": 1.49
      },
      "monthlySpending": {
        "amount": "2745.26",
        "budgeted": "3200.00",
        "changePercent": -6.4
      },
      "cashFlow": {
        "income": "6200.00",
        "expenses": "2745.26",
        "projected": "3100.00"
      }
    },
    "goals": [
      {
        "id": "e1f572a8-7bf8-4435-8d62-61c92dfd6f81",
        "name": "Emergency Fund",
        "progressPercent": 26
      }
    ],
    "alerts": [
      {
        "id": "alert-239",
        "type": "bill_due_soon",
        "message": "Rent is due in 3 days.",
        "severity": "high"
      }
    ],
    "aiHighlights": [
      {
        "id": "ins-a93d",
        "title": "Lower dining budget",
        "confidence": 0.82
      }
    ]
  }
}
```

### GET /api/dashboard/alerts
- **Purpose**: List actionable alerts aggregated from Budgets, Bills, Notifications, and AI Insights.
- **Auth**: Requires authenticated session

**Query Parameters**
- `severity` (`low|medium|high`) optional
- `scope` (`budget|bill|goal|insight`) optional

**Responses**
- `200 OK`
```json
{
  "data": {
    "alerts": [
      {
        "id": "alert-239",
        "scope": "bill",
        "relatedId": "94f20c31-cbd3-4eaa-bc50-8a256cbfc35b",
        "message": "Rent is due in 3 days.",
        "severity": "high",
        "createdAt": "2025-09-27T14:00:00Z"
      }
    ]
  },
  "meta": {}
}
```

### POST /api/dashboard/quick-actions
- **Purpose**: Execute composite quick actions (e.g., transfer funds then mark bill as paid).
- **Auth**: Requires authenticated session
- **Headers**: `Content-Type: application/json`

**Request Body**
```json
{
  "action": "pay_bill_and_transfer",
  "payload": {
    "billId": "94f20c31-cbd3-4eaa-bc50-8a256cbfc35b",
    "transferRuleId": "6bc50f99-6d2f-4a85-91fa-ef72fce08ba0"
  }
}
```

**Validation (Zod)**
```ts
const QuickActionRequest = z.object({
  action: z.enum(["pay_bill_and_transfer", "increase_goal_allocation", "acknowledge_alert"]),
  payload: z.record(z.any())
});
```

**Responses**
- `202 Accepted`
```json
{
  "data": {
    "actionId": "qa-54f3d2",
    "status": "queued"
  }
}
```

**Errors**
- `400` `QUICK_ACTION_UNSUPPORTED`
- `409` `QUICK_ACTION_CONFLICT` when dependent resources stale.

## Async Event Schema (Next Steps)

Event payload definitions referenced by each service will be documented in `docs/event-contracts.md` as follow-up work aligned with architecture section 7.
