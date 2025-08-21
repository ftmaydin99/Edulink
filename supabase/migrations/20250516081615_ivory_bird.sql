/*
  # Add faculty and department columns to lecturers table if they don't exist
  
  1. Changes
    - Safely add faculty_id and department_id columns if they don't exist
    - Add foreign key constraints to faculties and departments tables
  
  2. Security
    - Maintain existing RLS policies
*/

DO $$ 
BEGIN
  -- Add faculty_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lecturers' AND column_name = 'faculty_id'
  ) THEN
    ALTER TABLE lecturers
    ADD COLUMN faculty_id uuid REFERENCES faculties(id);
  END IF;

  -- Add department_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lecturers' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE lecturers
    ADD COLUMN department_id uuid REFERENCES departments(id);
  END IF;
END $$;