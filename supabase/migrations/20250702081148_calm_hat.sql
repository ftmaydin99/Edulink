/*
  # Add is_first_login column to lecturers table

  1. Changes
    - Add `is_first_login` column to `lecturers` table
    - Set default value to `true` for new lecturers
    - Set existing lecturers to `false` (assuming they've already logged in)

  2. Security
    - No RLS changes needed as this is just adding a column
*/

-- Add the is_first_login column to the lecturers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecturers' AND column_name = 'is_first_login'
  ) THEN
    ALTER TABLE lecturers ADD COLUMN is_first_login boolean DEFAULT true;
    
    -- Set existing lecturers to false (assuming they've already logged in)
    UPDATE lecturers SET is_first_login = false WHERE is_first_login IS NULL;
  END IF;
END $$;