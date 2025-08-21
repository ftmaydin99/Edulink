-- Fix ambiguous column reference in trigger function
DROP FUNCTION IF EXISTS update_appointment_student_info() CASCADE;

CREATE OR REPLACE FUNCTION update_appointment_student_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Update appointment with student information
  UPDATE appointments 
  SET 
    student_name = s.name,
    student_email = s.email,
    student_faculty = f.name,
    student_department = d.name,
    student_year = s.year
  FROM students s
  LEFT JOIN faculties f ON s.faculty_id = f.id
  LEFT JOIN departments d ON s.department_id = d.id
  WHERE appointments.id = NEW.id 
    AND appointments.student_id = s.id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;