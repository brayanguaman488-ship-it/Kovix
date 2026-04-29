DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole'
      AND e.enumlabel = 'ADMINISTRADOR'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'ADMINISTRADOR';
  END IF;
END
$$;
