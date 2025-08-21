/*
  # Add unique constraint for lecturer appointments
  
  1. Changes
    - Add unique constraint to prevent duplicate appointments
    - Add index for better query performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add unique constraint for lecturer appointments
ALTER TABLE appointments
ADD CONSTRAINT unique_lecturer_appointment 
UNIQUE (lecturer_id, date, start_time);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_lecturer_appointments 
ON appointments(lecturer_id, date, start_time);