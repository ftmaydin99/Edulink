/*
  # Update availabilities table structure
  
  1. Changes
    - Replace day_of_week with date column
    - Remove duplicate entries
    - Add unique constraint for lecturer-date pairs
    
  2. Security
    - Maintain existing RLS policies
*/

-- First create the date column as nullable
ALTER TABLE availabilities 
DROP COLUMN IF EXISTS day_of_week,
ADD COLUMN IF NOT EXISTS date date;

-- Create a temporary date for existing records (current date)
UPDATE availabilities
SET date = CURRENT_DATE
WHERE date IS NULL;

-- Remove duplicates keeping only the first record for each lecturer and date
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY lecturer_id, date ORDER BY id) as rn
  FROM availabilities
)
DELETE FROM availabilities
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Now make the column NOT NULL
ALTER TABLE availabilities 
ALTER COLUMN date SET NOT NULL;

-- Add index on date column for better performance
CREATE INDEX IF NOT EXISTS idx_availabilities_date ON availabilities(date);

-- Add constraint to prevent duplicate dates for the same lecturer
ALTER TABLE availabilities
ADD CONSTRAINT unique_lecturer_date UNIQUE (lecturer_id, date);