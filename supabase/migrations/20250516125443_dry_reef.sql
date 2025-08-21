/*
  # Fix appointment status trigger
  
  1. Changes
    - Remove recursive updates
    - Simplify trigger logic
    - Fix status updates
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
DROP FUNCTION IF EXISTS handle_appointment_status_change();

-- Create new trigger function
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- User validation
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized operation';
  END IF;

  -- Set processed info
  NEW.processed_at := CURRENT_TIMESTAMP;
  NEW.processed_by := v_user_id;

  -- Handle approval
  IF NEW.status = 'onaylandı' THEN
    INSERT INTO approved_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, approved_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, v_user_id
    );
  END IF;

  -- Handle cancellation
  IF NEW.status = 'iptal' THEN
    INSERT INTO cancelled_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, cancelled_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, v_user_id
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'handle_appointment_status_change',
      'Error occurred',
      jsonb_build_object(
        'error', SQLERRM,
        'appointment_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER appointment_status_change
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();