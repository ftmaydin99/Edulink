/*
  # Update lecturers table for new auth flow
  
  1. Changes
    - Remove password column as it's now handled by Supabase Auth
    - Keep must_change_password for first login check
    - Update existing policies
  
  2. Security
    - Maintain existing RLS policies
    - Ensure smooth transition for existing data
*/

-- Remove password column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lecturers' AND column_name = 'password'
  ) THEN
    ALTER TABLE lecturers DROP COLUMN password;
  END IF;
END $$;

-- Update existing policies
DROP POLICY IF EXISTS "Lecturers can manage their own profile" ON lecturers;
DROP POLICY IF EXISTS "Lecturers can view their own profile" ON lecturers;

-- Create new policies
CREATE POLICY "Lecturers can manage their own profile"
ON lecturers
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Update existing data to ensure must_change_password is set
UPDATE lecturers
SET must_change_password = true
WHERE must_change_password IS NULL;