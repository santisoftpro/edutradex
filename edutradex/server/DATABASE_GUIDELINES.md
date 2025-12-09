# Database Change Guidelines for Production

**CRITICAL: This project is in PRODUCTION. Any database-related code changes must follow these guidelines to prevent production failures.**

## Table of Contents
1. [Quick Checklist](#quick-checklist)
2. [Before Making Any Database Changes](#before-making-any-database-changes)
3. [Raw SQL Query Rules](#raw-sql-query-rules)
4. [Schema Changes and Migrations](#schema-changes-and-migrations)
5. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
6. [Testing Requirements](#testing-requirements)

---

## Quick Checklist

Before pushing ANY code that touches the database, verify:

- [ ] Checked `prisma/schema.prisma` for exact column names and types
- [ ] All column names in raw SQL are properly quoted (e.g., `"userId"`, `"firstName"`)
- [ ] Parameter types match database column types exactly
- [ ] Null handling is implemented (never use `!` non-null assertions without checks)
- [ ] If schema changed: migration created and tested
- [ ] Query tested against production-like data
- [ ] Error handling covers database failures
- [ ] No breaking changes to existing API contracts

---

## Before Making Any Database Changes

### 1. Always Check the Prisma Schema First

**Location:** `edutradex/server/prisma/schema.prisma`

Before writing or modifying any database queries:

```bash
# Always review the relevant model in schema.prisma
cat prisma/schema.prisma | grep -A 30 "model KYC"
```

Verify:
- Exact column names (case-sensitive)
- Data types (String, Int, Float, DateTime, Boolean, etc.)
- Optional vs required fields (? means optional)
- Relationships and foreign keys
- Default values

### 2. Understand Your Database Configuration

- **Database:** PostgreSQL
- **ORM:** Prisma
- **Query Methods:**
  - Prisma Client (recommended)
  - Raw SQL queries (requires extra care)

---

## Raw SQL Query Rules

### Critical Rule: Quote All Mixed-Case Identifiers

PostgreSQL is case-insensitive for unquoted identifiers but preserves case for quoted ones. Our Prisma schema uses camelCase, so **ALL identifiers MUST be quoted in raw SQL**.

#### ✅ CORRECT Examples:

```typescript
// Column names quoted
await queryOne(
  `SELECT * FROM "KYC" WHERE "userId" = $1`,
  [userId]
);

// All identifiers quoted
await queryOne(
  `UPDATE "KYC" SET
    "firstName" = $1,
    "lastName" = $2,
    "dateOfBirth" = $3,
    "nationality" = $4,
    "status" = 'PENDING'
   WHERE "userId" = $5 RETURNING *`,
  [firstName, lastName, dateOfBirth, nationality, userId]
);

// JOINs with table aliases
await queryMany(
  `SELECT k.*, u.email as "userEmail", u.name as "userName"
   FROM "KYC" k
   JOIN "User" u ON u.id = k."userId"
   WHERE k."status" = $1`,
  [status]
);
```

#### ❌ WRONG Examples:

```typescript
// Missing quotes - WILL FAIL in production
await queryOne(
  `SELECT * FROM KYC WHERE userId = $1`,
  [userId]
);

// Inconsistent quoting - DANGEROUS
await queryOne(
  `UPDATE "KYC" SET
    "firstName" = $1,
    lastName = $2,        // ❌ Missing quotes
    nationality = $3,     // ❌ Missing quotes
    status = 'PENDING'    // ❌ Missing quotes
   WHERE "userId" = $4`,
  [firstName, lastName, nationality, userId]
);
```

### Parameterized Queries Only

**NEVER** concatenate user input into SQL queries.

#### ✅ CORRECT:
```typescript
await queryOne(
  `SELECT * FROM "User" WHERE "email" = $1`,
  [userEmail]
);
```

#### ❌ WRONG (SQL Injection Risk):
```typescript
await queryOne(
  `SELECT * FROM "User" WHERE "email" = '${userEmail}'`
);
```

### Never Use Non-Null Assertions

Query results can fail unexpectedly. Always check for null.

#### ✅ CORRECT:
```typescript
const result = await queryOne<User>(
  `SELECT * FROM "User" WHERE "id" = $1`,
  [userId]
);

if (!result) {
  throw new Error('User not found');
}

return result;
```

#### ❌ WRONG:
```typescript
// Using ! assumes result exists - will crash if null
const result = (await queryOne<User>(
  `SELECT * FROM "User" WHERE "id" = $1`,
  [userId]
))!;

return result;
```

### Type Safety for Query Parameters

Don't use `any[]` for parameters.

#### ✅ CORRECT:
```typescript
const params: (string | number)[] = [];
let paramIndex = 1;

if (filters.status) {
  whereClause += ` AND "status" = $${paramIndex++}`;
  params.push(filters.status);
}

if (filters.userId) {
  whereClause += ` AND "userId" = $${paramIndex++}`;
  params.push(filters.userId);
}

await queryMany<Trade>(query, params);
```

#### ❌ WRONG:
```typescript
const params: any[] = [];  // ❌ No type safety
```

---

## Schema Changes and Migrations

### When You Need a Migration

You MUST create a migration when:
- Adding/removing tables
- Adding/removing columns
- Changing column types
- Changing column constraints (nullable, unique, etc.)
- Adding/removing indexes
- Changing relationships

### Migration Workflow

#### 1. Development Environment

```bash
# 1. Update prisma/schema.prisma with your changes

# 2. Create migration
npx prisma migrate dev --name descriptive_name_of_change

# Example:
npx prisma migrate dev --name add_kyc_verification_fields
```

#### 2. Production Deployment

```bash
# NEVER run migrate dev in production
# Instead, use migrate deploy

npx prisma migrate deploy
```

#### 3. Generate Prisma Client

```bash
# After any schema changes
npx prisma generate
```

### Example: Adding a New Column

**Step 1:** Update `prisma/schema.prisma`
```prisma
model KYC {
  id              String    @id @default(uuid())
  userId          String    @unique
  // ... existing fields ...

  // NEW FIELD
  verificationLevel String?  @default("BASIC")

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Step 2:** Create migration
```bash
npx prisma migrate dev --name add_verification_level_to_kyc
```

**Step 3:** Update TypeScript interfaces
```typescript
interface KYCRow {
  // ... existing fields ...
  verificationLevel: string | null;  // Add to interface
}
```

**Step 4:** Test thoroughly before deploying

---

## Common Mistakes to Avoid

### 1. Inconsistent Column Quoting

```typescript
// ❌ WRONG - Mixing quoted and unquoted
`UPDATE "KYC" SET "firstName" = $1, lastName = $2`

// ✅ CORRECT - All quoted
`UPDATE "KYC" SET "firstName" = $1, "lastName" = $2`
```

### 2. Forgetting RETURNING Clause

```typescript
// ❌ WRONG - No data returned
await queryOne(`UPDATE "KYC" SET "status" = $1 WHERE "id" = $2`, [status, id]);

// ✅ CORRECT - Returns updated row
await queryOne(`UPDATE "KYC" SET "status" = $1 WHERE "id" = $2 RETURNING *`, [status, id]);
```

### 3. Date Validation Missing

```typescript
// ❌ WRONG - No validation
const dateOfBirth = new Date(data.dateOfBirth);
await queryOne(`INSERT INTO "KYC" ("dateOfBirth") VALUES ($1)`, [dateOfBirth]);

// ✅ CORRECT - Validate first
const dateOfBirth = new Date(data.dateOfBirth);

if (isNaN(dateOfBirth.getTime())) {
  throw new Error('Invalid date');
}

if (dateOfBirth > new Date()) {
  throw new Error('Date cannot be in the future');
}

await queryOne(`INSERT INTO "KYC" ("dateOfBirth") VALUES ($1)`, [dateOfBirth]);
```

### 4. Not Handling Query Failures

```typescript
// ❌ WRONG - No error handling
const kyc = await queryOne(`SELECT * FROM "KYC" WHERE "id" = $1`, [id]);
return kyc.firstName;  // Will crash if kyc is null

// ✅ CORRECT - Handle null case
const kyc = await queryOne(`SELECT * FROM "KYC" WHERE "id" = $1`, [id]);

if (!kyc) {
  throw new Error('KYC record not found', 404);
}

return kyc.firstName;
```

### 5. Changing Column Names Without Migration

```typescript
// ❌ WRONG - Code change without migration
// Changed "phoneNumber" to "phone" in queries
// but schema still has "phoneNumber"
await queryOne(`SELECT "phone" FROM "KYC"`, []);  // WILL FAIL

// ✅ CORRECT - Create migration first
// 1. Update schema.prisma
// 2. Run: npx prisma migrate dev --name rename_phone_number_to_phone
// 3. Update queries
```

---

## Testing Requirements

### Before Committing Code

1. **Unit Tests**
   - Test all new database queries
   - Test error cases (null values, invalid data)
   - Test validation logic

2. **Integration Tests**
   - Test full flow with actual database
   - Use test database, not production

3. **Manual Testing Checklist**
   - [ ] Test with valid data
   - [ ] Test with invalid data (should fail gracefully)
   - [ ] Test with missing optional fields
   - [ ] Test with null values where applicable
   - [ ] Test with edge cases (very long strings, special characters, etc.)

### Before Deploying to Production

1. **Migration Test**
   ```bash
   # On staging/test environment
   npx prisma migrate deploy
   ```

2. **Backup Database**
   ```bash
   # Create backup before deploying schema changes
   pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Rollback Plan**
   - Know how to rollback the migration
   - Have backup ready
   - Test rollback procedure

---

## Emergency Procedures

### If Production Query Fails

1. **Check logs immediately**
   ```bash
   # Look for SQL errors in application logs
   tail -f logs/application.log | grep -i "error"
   ```

2. **Common fixes:**
   - Missing column quotes
   - Wrong column name
   - Type mismatch
   - Missing null check

3. **Quick hotfix workflow:**
   ```bash
   # Fix code
   # Test locally
   # Deploy immediately
   git add .
   git commit -m "hotfix: fix database query error in [feature]"
   git push
   ```

### If Migration Fails

1. **DO NOT PANIC**
2. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```

3. **If migration is half-applied:**
   - Review the SQL in `prisma/migrations/`
   - Manually fix database if needed
   - Mark migration as applied: `npx prisma migrate resolve --applied [migration_name]`

---

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Identifier Rules](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)
- Schema location: `edutradex/server/prisma/schema.prisma`
- Database config: `edutradex/server/src/config/db.ts`

---

## Questions?

If you're unsure about a database change:
1. Review this document
2. Check the Prisma schema
3. Ask for code review before pushing
4. Test thoroughly in development first

**Remember: It's better to ask than to break production!**
