/*
  # Add appointment restriction system
  
  1. Changes
    - Add function to check student restrictions
    - Add trigger to handle restrictions
    - Add table to track restrictions
    
  2. Security
    - Only allow viewing own restrictions
    - Maintain existing RLS policies
*/

-- Create restrictions table
CREATE TABLE appointment_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_restriction_dates CHECK (end_date > start_date)
);

-- Enable RLS
ALTER TABLE appointment_restrictions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Students can view their restrictions"
ON appointment_restrictions FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Function to check if student is restricted
CREATE OR REPLACE FUNCTION check_student_restriction(
  p_student_id uuid,
  p_lecturer_id uuid
) RETURNS boolean AS $$
DECLARE
  v_is_restricted boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM appointment_restrictions
    WHERE student_id = p_student_id
    AND lecturer_id = p_lecturer_id
    AND CURRENT_DATE BETWEEN start_date AND end_date
  ) INTO v_is_restricted;
  
  RETURN v_is_restricted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add restriction
CREATE OR REPLACE FUNCTION add_student_restriction(
  p_student_id uuid,
  p_lecturer_id uuid,
  p_days integer DEFAULT 7
) RETURNS void AS $$
BEGIN
  INSERT INTO appointment_restrictions (
    student_id,
    lecturer_id,
    start_date,
    end_date
  )
  VALUES (
    p_student_id,
    p_lecturer_id,
    CURRENT_DATE,
    CURRENT_DATE + (p_days || ' days')::interval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to handle restrictions
CREATE OR REPLACE FUNCTION handle_appointment_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add restriction if cancelling an approved appointment
  IF OLD.status = 'onaylandı' AND NEW.status = 'iptal' AND NEW.processed_by IS NULL THEN
    -- Add 7-day restriction
    PERFORM add_student_restriction(NEW.student_id, NEW.lecturer_id);
    
    -- Log the restriction
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'handle_appointment_cancellation',
      'Added student restriction',
      jsonb_build_object(
        'student_id', NEW.student_id,
        'lecturer_id', NEW.lecturer_id,
        'appointment_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS appointment_cancellation ON appointments;
CREATE TRIGGER appointment_cancellation
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_cancellation();