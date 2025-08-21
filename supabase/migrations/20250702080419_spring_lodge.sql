/*
  # Add first login tracking for lecturers
  
  1. Changes
    - Add is_first_login column to lecturers table
    - Set default value to true for new lecturers
    - Update existing lecturers to require password change
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add is_first_login column to lecturers table
ALTER TABLE lecturers
ADD COLUMN IF NOT EXISTS is_first_login boolean DEFAULT true;

-- Update existing lecturers to require password change on first login
UPDATE lecturers
SET is_first_login = true
WHERE is_first_login IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lecturers_first_login ON lecturers(is_first_login);