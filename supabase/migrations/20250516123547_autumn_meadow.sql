/*
  # Fix appointment status handling
  
  1. Changes
    - Drop and recreate status column with proper constraints
    - Update trigger function to handle status changes correctly
    - Add additional validation checks
    
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity during status changes
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
DROP FUNCTION IF EXISTS handle_appointment_status_change();

-- Recreate status column with proper constraints
ALTER TABLE appointments 
DROP COLUMN IF EXISTS status;

ALTER TABLE appointments
ADD COLUMN status text NOT NULL DEFAULT 'bekliyor'
CHECK (status IN ('bekliyor', 'onaylandı', 'iptal'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

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

  -- Only allow transitions from 'bekliyor'
  IF OLD.status != 'bekliyor' THEN
    RAISE EXCEPTION 'Only pending appointments can be updated';
  END IF;

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

  -- Log the status change
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'handle_appointment_status_change',
    'Status changed successfully',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'user_id', v_user_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();