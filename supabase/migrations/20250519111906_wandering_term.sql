/*
  # Update student information in appointments
  
  1. Changes
    - Update existing appointments with faculty and department names
    - Fix student information display
    
  2. Security
    - Maintain existing RLS policies
*/

-- Update existing appointments with proper faculty and department names
UPDATE appointments a
SET 
  student_faculty = f.name,
  student_department = d.name
FROM 
  students s
  JOIN faculties f ON s.faculty_id = f.id
  JOIN departments d ON s.department_id = d.id
WHERE 
  a.student_id = s.id
  AND (a.student_faculty IS NULL OR a.student_department IS NULL 
    OR a.student_faculty ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR a.student_department ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_appointment_student_info ON appointments;
DROP FUNCTION IF EXISTS update_appointment_student_info();

-- Create new trigger function to automatically update student info
CREATE OR REPLACE FUNCTION update_appointment_student_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Get student information including faculty and department names
  SELECT 
    s.name,
    s.email,
    f.name,
    d.name,
    s.year
  INTO 
    NEW.student_name,
    NEW.student_email,
    NEW.student_faculty,
    NEW.student_department,
    NEW.student_year
  FROM 
    students s
    JOIN faculties f ON s.faculty_id = f.id
    JOIN departments d ON s.department_id = d.id
  WHERE 
    s.id = NEW.student_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER update_appointment_student_info
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_student_info();