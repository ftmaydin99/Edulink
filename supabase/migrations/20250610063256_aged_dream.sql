/*
  # Add title field to lecturers table
  
  1. Changes
    - Add title column to lecturers table for academic titles
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add title column to lecturers table
ALTER TABLE lecturers
ADD COLUMN IF NOT EXISTS title text;

-- Update existing lecturers with sample titles
UPDATE lecturers
SET title = CASE 
  WHEN name LIKE 'Prof. Dr.%' THEN 'Prof. Dr.'
  WHEN name LIKE 'Doç. Dr.%' THEN 'Doç. Dr.'
  WHEN name LIKE 'Dr. Öğr. Üyesi%' THEN 'Dr. Öğr. Üyesi'
  WHEN name LIKE 'Öğr. Gör. Dr.%' THEN 'Öğr. Gör. Dr.'
  WHEN name LIKE 'Öğr. Gör.%' THEN 'Öğr. Gör.'
  ELSE 'Dr. Öğr. Üyesi'
END
WHERE title IS NULL;