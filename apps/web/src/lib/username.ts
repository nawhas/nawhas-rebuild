import { z } from 'zod';

/**
 * Public username schema. Lowercased server-side via the `users_username_idx`
 * functional unique index — collisions surface as Postgres 23505 and are
 * mapped to a friendly "Username already taken" error in the signup form.
 *
 * Constraints:
 *   - 3–32 chars, letters / digits / underscore only.
 *   - Case-insensitive uniqueness (enforced by lower() unique index).
 *
 * Lives in its own module (no nodemailer/Postgres imports) so it can be
 * pulled into client components without dragging server-only dependencies
 * through the App Router bundler.
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters.')
  .max(32, 'Username must be 32 characters or fewer.')
  .regex(
    /^[a-z0-9_]+$/i,
    'Username may contain only letters, numbers, and underscores.',
  );
