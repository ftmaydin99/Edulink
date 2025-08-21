-- Fix all database triggers with ambiguous 'name' column references

-- First, drop existing triggers
DROP TRIGGER IF EXISTS appointment_email_trigger ON appointments;
DROP TRIGGER IF EXISTS update_appointment_student_info ON appointments;
DROP TRIGGER IF EXISTS update_student_info ON appointments;

-- Drop existing functions
DROP FUNCTION IF EXISTS send_appointment_email();
DROP FUNCTION IF EXISTS update_appointment_student_info();
DROP FUNCTION IF EXISTS update_student_info();

-- Create fixed send_appointment_email function
CREATE OR REPLACE FUNCTION send_appointment_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert debug log
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'send_appointment_email_trigger',
    'Appointment email trigger fired',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'student_id', NEW.student_id,
      'lecturer_id', NEW.lecturer_id,
      'status', NEW.status
    )
  );

  -- Call the edge function (this will be handled by the edge function)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create fixed update_appointment_student_info function
CREATE OR REPLACE FUNCTION update_appointment_student_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if student info fields are empty
  IF NEW.student_name IS NULL OR NEW.student_email IS NULL OR 
     NEW.student_faculty IS NULL OR NEW.student_department IS NULL THEN
    
    -- Get student info with explicit column references
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
    FROM students s
    LEFT JOIN faculties f ON s.faculty_id = f.id
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.id = NEW.student_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create fixed update_student_info function (alternative name)
CREATE OR REPLACE FUNCTION update_student_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Get student info with explicit column references
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
  FROM students s
  LEFT JOIN faculties f ON s.faculty_id = f.id
  LEFT JOIN departments d ON s.department_id = d.id
  WHERE s.id = NEW.student_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER appointment_email_trigger
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_appointment_email();

CREATE TRIGGER update_appointment_student_info
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_student_info();

-- Add debug log to confirm triggers are recreated
INSERT INTO debug_logs (function_name, message, details)
VALUES (
  'trigger_recreation',
  'All appointment triggers recreated successfully',
  jsonb_build_object(
    'timestamp', NOW(),
    'triggers_created', ARRAY['appointment_email_trigger', 'update_appointment_student_info']
  )
);