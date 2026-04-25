/**
 * One-shot dev/staging script to fill `users.username` for any rows
 * where it's NULL. Derives a candidate from the email-local-part with a
 * numeric collision suffix that increments on Postgres 23505.
 *
 * Production: NEVER run this — every user picks their own username at
 * signup (enforced by better-auth `additionalFields.username` + the
 * unique `users_username_idx`). Backfill is only meaningful for DBs
 * created before Phase G shipped.
 *
 * Run: pnpm --filter @nawhas/web tsx scripts/backfill-usernames.ts
 */
import { db, users } from '@nawhas/db';
import { eq, isNull } from 'drizzle-orm';

function deriveUsername(email: string): string {
  const local = email.split('@')[0] ?? 'user';
  return local.replace(/[^a-z0-9_]/gi, '_').slice(0, 32).toLowerCase() || 'user';
}

async function main(): Promise<void> {
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(isNull(users.username));

  let fixed = 0;
  for (const row of rows) {
    const base = deriveUsername(row.email);
    let candidate = base;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await db
          .update(users)
          .set({ username: candidate })
          .where(eq(users.id, row.id));
        fixed++;
        break;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === '23505'
        ) {
          suffix++;
          candidate = `${base}_${suffix}`.slice(0, 32);
          continue;
        }
        throw err;
      }
    }
  }
  console.log(`Backfilled ${fixed} usernames.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
