/*
  # Add viewed column to appointments table
  
  1. Changes
    - Add `viewed_by_student` column to appointments table
    - Default value is false (not viewed)
    - Add index for better performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add viewed_by_student column
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS viewed_by_student boolean DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_viewed_by_student 
ON appointments(student_id, viewed_by_student);