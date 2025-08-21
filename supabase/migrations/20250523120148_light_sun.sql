/*
  # Update appointment status trigger
  
  1. Changes
    - Add message handling for student cancellations
    - Fix processed_by handling for different user types
    - Improve logging
    
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
  v_cancel_reason text;
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

  -- Handle cancellation messages
  IF NEW.status = 'iptal' THEN
    -- Get cancellation reason from TG_ARGV if provided
    IF TG_NARGS > 0 THEN
      v_cancel_reason := TG_ARGV[0];
    END IF;

    -- Insert cancellation message
    IF v_is_lecturer THEN
      -- Lecturer cancelling appointment
      INSERT INTO messages (
        from_lecturer_id,
        to_student_id,
        content
      )
      VALUES (
        v_user_id,
        NEW.student_id,
        format(
          'Randevunuz öğretim görevlisi tarafından iptal edilmiştir.%sİptal Nedeni: %s',
          E'\n',
          COALESCE(v_cancel_reason, 'Belirtilmemiş')
        )
      );
    ELSE
      -- Student cancelling appointment
      INSERT INTO messages (
        from_student_id,
        to_lecturer_id,
        content
      )
      VALUES (
        v_user_id,
        NEW.lecturer_id,
        format(
          'Öğrenci randevuyu iptal etti.%sİptal Nedeni: %s',
          E'\n',
          COALESCE(v_cancel_reason, 'Belirtilmemiş')
        )
      );
    END IF;
  END IF;

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
      'is_lecturer', v_is_lecturer,
      'cancel_reason', v_cancel_reason
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