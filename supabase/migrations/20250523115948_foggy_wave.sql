/*
  # Update appointment status trigger
  
  1. Changes
    - Add check for lecturer vs student
    - Set processed_by correctly based on user type
    - Maintain existing functionality
    
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
  v_is_lecturer boolean;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- User validation
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized operation';
  END IF;

  -- Check if user is a lecturer
  SELECT EXISTS (
    SELECT 1 FROM lecturers WHERE id = v_user_id
  ) INTO v_is_lecturer;

  -- Set processed_by based on user type
  IF v_is_lecturer THEN
    NEW.processed_by := v_user_id; -- Only for lecturers
  ELSE
    NEW.processed_by := NULL;      -- For students
  END IF;

  NEW.processed_at := CURRENT_TIMESTAMP;

  -- Log the status change
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'handle_appointment_status_change',
    'Status changed successfully',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'user_id', v_user_id,
      'is_lecturer', v_is_lecturer
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER appointment_status_change
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();