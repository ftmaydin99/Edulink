/*
  # Add weekly recurring availabilities
  
  1. Changes
    - Add day_of_week column to availabilities table
    - Add function to check availability for a given date
    - Update existing availabilities to include day_of_week
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add day_of_week column
ALTER TABLE availabilities
ADD COLUMN IF NOT EXISTS day_of_week smallint;

-- Update existing availabilities with day_of_week
UPDATE availabilities
SET day_of_week = EXTRACT(DOW FROM date);

-- Function to check availability for a given date
CREATE OR REPLACE FUNCTION check_lecturer_availability(
  p_lecturer_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time
) RETURNS boolean AS $$
DECLARE
  v_day_of_week smallint;
  v_has_availability boolean;
BEGIN
  -- Get day of week for the requested date (0-6, Sunday-Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check if lecturer has availability for this day and time
  SELECT EXISTS (
    SELECT 1
    FROM availabilities
    WHERE lecturer_id = p_lecturer_id
    AND day_of_week = v_day_of_week
    AND start_time <= p_start_time
    AND end_time >= p_end_time
    AND (
      -- Either it's a recurring availability (no specific date)
      date IS NULL
      -- Or it's specifically set for this date
      OR date = p_date
    )
  ) INTO v_has_availability;
  
  RETURN v_has_availability;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;