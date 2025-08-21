/*
  # Remove password column from students table
  
  1. Changes
    - Remove password column from students table as it's not needed (passwords are handled by Supabase Auth)
  
  2. Security
    - No changes to RLS policies
*/

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'password'
  ) THEN
    ALTER TABLE students DROP COLUMN password;
  END IF;
END $$;