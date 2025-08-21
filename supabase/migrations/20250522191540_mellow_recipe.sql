/*
  # Add password change functionality to students
  
  1. Changes
    - Add must_change_password column to students table
    - Add password column to students table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add must_change_password column
ALTER TABLE students
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Add password column if it doesn't exist
ALTER TABLE students
ADD COLUMN IF NOT EXISTS password text;