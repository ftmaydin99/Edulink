/*
  # Add day_of_week to availabilities table
  
  1. Changes
    - Add `day_of_week` column to `availabilities` table
    - Compute day_of_week from existing date column
  
  2. Notes
    - day_of_week is 0-6 (Sunday-Saturday)
    - Maintains existing data integrity
*/

ALTER TABLE availabilities 
ADD COLUMN IF NOT EXISTS day_of_week smallint;

-- Update day_of_week based on existing date column
DO $$
BEGIN
  UPDATE availabilities 
  SET day_of_week = EXTRACT(DOW FROM date);
END $$;