# Domain Model & ERD Outline

This document models the core entities required by the Finance Manager Dashboard and captures relationships equivalent to an ERD. It satisfies backlog Task: "Model core domain entities". A graphical diagram will be generated from this source in a future iteration using dbdiagram.io or draw.io export.

## Entity Catalog

### User (`users`)
- **Primary Key**: `id` (UUID v7)
- **Attributes**: `email`, `password_hash`, `email_verified_at`, `created_at`, `updated_at`, `last_login_at`, `status` (`active`, `invited`, `suspended`), `plan_tier` (`free`, `pro`, `family`), `preferences_json`
- **Relationships**:
  - One-to-many with `roles_users`
  - One-to-many with `accounts`, `goals`, `budgets`, `notifications`, `ai_sessions`
  - One-to-one with `user_profiles`

### Role (`roles`)
- **Primary Key**: `id`
- **Attributes**: `name` (`owner`, `member`, `admin`), `description`
- **Relationships**: Many-to-many to `users` through `roles_users`

### User Profile (`user_profiles`)
- **Primary Key**: `user_id`
- **Attributes**: `first_name`, `last_name`, `phone`, `timezone`, `theme_preference`, `layout_config_json`, `notification_preferences_json`
- **Relationships**: One-to-one with `users`

### Account (`accounts`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `institution_name`, `account_name`, `account_type` (`checking`, `savings`, `credit`, `investment`, `loan`), `mask`, `currency`, `current_balance`, `available_balance`, `plaid_item_id`, `plaid_account_id`, `status`, `created_at`
- **Relationships**:
  - Many-to-one with `users`
  - One-to-many with `transactions`, `account_snapshots`, `bills`

### Account Snapshot (`account_snapshots`)
- **Primary Key**: `id`
- **Attributes**: `account_id`, `captured_at`, `current_balance`, `available_balance`
- **Relationships**: Many-to-one with `accounts`

### Transaction (`transactions`)
- **Primary Key**: `id`
- **Attributes**: `account_id`, `user_id`, `posted_at`, `description`, `merchant_name`, `amount`, `direction` (`credit`, `debit`), `category_id`, `notes`, `status` (`pending`, `cleared`, `disputed`), `source` (`plaid`, `import`, `manual`), `receipt_url`
- **Relationships**:
  - Many-to-one with `accounts`
  - Many-to-one with `users`
  - Many-to-one with `categories`
  - Many-to-many with `tags` via `transaction_tags`
  - One-to-many with `transaction_rules_logs`

### Category (`categories`)
- **Primary Key**: `id`
- **Attributes**: `user_id` (nullable for global defaults), `name`, `type` (`income`, `expense`, `transfer`), `color_token`, `parent_category_id`
- **Relationships**:
  - Self-referential tree via `parent_category_id`
  - Many-to-one with `users`
  - One-to-many with `transactions`

### Tag (`tags`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `label`, `color_token`
- **Relationships**: Many-to-many with `transactions`

### Budget (`budgets`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `name`, `period` (`monthly`, `weekly`, `custom`), `start_date`, `end_date`, `target_amount`, `rollover_enabled`, `alerts_enabled`
- **Relationships**:
  - Many-to-one with `users`
  - One-to-many with `budget_categories`
  - One-to-many with `budget_periods`

### Budget Category (`budget_categories`)
- **Primary Key**: `id`
- **Attributes**: `budget_id`, `category_id`, `allocated_amount`, `alert_threshold_percent`
- **Relationships**: Many-to-one with `budgets` and `categories`

### Budget Period (`budget_periods`)
- **Primary Key**: `id`
- **Attributes**: `budget_id`, `period_start`, `period_end`, `spent_amount`, `remaining_amount`
- **Relationships**: Many-to-one with `budgets`

### Goal (`goals`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `name`, `target_amount`, `current_amount`, `target_date`, `category`, `priority`, `ai_recommendation_status`
- **Relationships**: Many-to-one with `users`, one-to-many with `goal_contributions`

### Goal Contribution (`goal_contributions`)
- **Primary Key**: `id`
- **Attributes**: `goal_id`, `source_transaction_id` (nullable), `amount`, `contributed_at`, `note`
- **Relationships**: Many-to-one with `goals`, optional many-to-one with `transactions`

### Bill (`bills`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `account_id`, `name`, `amount_due`, `due_date`, `frequency` (`monthly`, `quarterly`, `annual`, `custom`), `auto_pay_enabled`, `status` (`upcoming`, `paid`, `overdue`), `last_paid_transaction_id`
- **Relationships**: Many-to-one with `users` and `accounts`; optional reference to `transactions`

### Reminder (`reminders`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `bill_id` (nullable), `type` (`bill`, `goal`, `budget`, `custom`), `message`, `scheduled_for`, `delivery_channel` (`email`, `sms`, `push`), `status`
- **Relationships**: Many-to-one with `users`; optional many-to-one with `bills`

### Savings Rule (`savings_rules`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `type` (`fixed`, `percentage`, `round_up`), `amount`, `percentage`, `round_up_to`, `source_account_id`, `destination_account_id`, `schedule_cron`, `status`
- **Relationships**: Many-to-one with `users` and `accounts` (source/destination)

### Notification (`notifications`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `type`, `title`, `body`, `metadata_json`, `sent_via` (`email`, `sms`, `in_app`, `push`), `status`, `created_at`, `read_at`
- **Relationships**: Many-to-one with `users`

### AI Session (`ai_sessions`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `session_ref`, `started_at`, `ended_at`, `model_version`, `context_vector_id`
- **Relationships**: Many-to-one with `users`; one-to-many with `ai_messages`

### AI Message (`ai_messages`)
- **Primary Key**: `id`
- **Attributes**: `ai_session_id`, `sender` (`user`, `assistant`, `system`), `content`, `token_usage_prompt`, `token_usage_completion`, `created_at`, `feedback_rating`
- **Relationships**: Many-to-one with `ai_sessions`

### Export Job (`export_jobs`)
- **Primary Key**: `id`
- **Attributes**: `user_id`, `report_type`, `format` (`csv`, `pdf`, `xlsx`), `status` (`pending`, `processing`, `ready`, `failed`), `requested_at`, `completed_at`, `download_url`
- **Relationships**: Many-to-one with `users`

### Audit Event (`audit_events`)
- **Primary Key**: `id`
- **Attributes**: `user_id` (nullable for unauthenticated), `actor`, `action`, `resource_type`, `resource_id`, `metadata_json`, `created_at`, `ip_address`
- **Relationships**: Optional many-to-one with `users`

## Relationship Summary (Textual ERD)
```
users 1---N accounts
users 1---N goals
users 1---N budgets
users 1---N notifications
users 1---N ai_sessions
users 1---N reminder
users 1---N savings_rules
users 1---N export_jobs
users 1---1 user_profiles
roles N---N users (via roles_users)
accounts 1---N transactions
accounts 1---N account_snapshots
accounts 1---N bills
transactions N---1 categories
transactions N---N tags (via transaction_tags)
transactions N---1 users
transactions 1---N transaction_rules_logs
budgets 1---N budget_categories
budgets 1---N budget_periods
categories 1---N budget_categories
categories 1---N transactions
categories 1---N categories (self)
goals 1---N goal_contributions
transactions 1---N goal_contributions (optional)
bills 1---N reminders
ai_sessions 1---N ai_messages
```

## Constraints & Notes
- All monetary values use `NUMERIC(12,2)` scale with ISO 4217 currency referencing `accounts.currency`.
- Soft delete columns (`deleted_at`) exist on user-facing entities (accounts, transactions, budgets, goals, bills, savings_rules) to satisfy GDPR purge requirements from the PDF.
- Multi-tenant isolation is scoped by `user_id`; future family plans allow shared budgets via `household_id` extension not yet modeled.
- Prisma schemas will mirror the above naming with `camelCase` fields in the client while preserving snake_case in the database.
