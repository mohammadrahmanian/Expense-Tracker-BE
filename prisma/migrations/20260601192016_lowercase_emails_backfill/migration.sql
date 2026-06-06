-- Backfill: normalize all User emails to lowercase.
-- Guard first: lowercasing can collide on the unique User.email constraint when
-- two rows differ only by case. Fail loudly (and roll back) listing the
-- conflicts instead of erroring opaquely on the constraint mid-update.
DO $$
DECLARE
  conflicts text;
BEGIN
  SELECT string_agg(le, ', ') INTO conflicts
  FROM (
    SELECT LOWER(email) AS le
    FROM "User"
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  ) dups;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot lowercase emails: addresses differ only by case: %', conflicts;
  END IF;

  UPDATE "User" SET email = LOWER(email) WHERE email <> LOWER(email);
END $$;
