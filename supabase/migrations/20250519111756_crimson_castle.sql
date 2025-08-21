/*
  # Update student information in appointments
  
  1. Changes
    - Update existing appointments with proper faculty and department names
    - Create trigger to automatically populate student information
    - Add proper error handling and validation
    
  2. Security
    - Use SECURITY DEFINER for proper permissions
    - Maintain existing RLS policies
*/

-- Create a function to safely get faculty name
CREATE OR REPLACE FUNCTION get_faculty_name(faculty_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (SELECT name FROM faculties WHERE id = faculty_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely get department name
CREATE OR REPLACE FUNCTION get_department_name(department_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (SELECT name FROM departments WHERE id = department_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing appointments
UPDATE appointments a
SET 
  student_faculty = get_faculty_name(s.faculty_id),
  student_department = get_department_name(s.department_id)
FROM 
  students s
WHERE 
  a.student_id = s.id;

-- Create trigger function for new appointments
CREATE OR REPLACE FUNCTION update_student_info()
RETURNS TRIGGER AS $$
DECLARE
  v_faculty_name text;
  v_department_name text;
  v_student RECORD;
BEGIN
  -- Get student information
  SELECT * INTO v_student
  FROM students
  WHERE id = NEW.student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  -- Get faculty and department names
  v_faculty_name := get_faculty_name(v_student.faculty_id);
  v_department_name := get_department_name(v_student.department_id);

  -- Update appointment with student information
  NEW.student_name := v_student.name;
  NEW.student_email := v_student.email;
  NEW.student_faculty := v_faculty_name;
  NEW.student_department := v_department_name;
  NEW.student_year := v_student.year;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS update_student_info ON appointments;
CREATE TRIGGER update_student_info
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_info();