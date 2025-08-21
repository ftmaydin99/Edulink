/*
  # Add appointment cancellation restrictions
  
  1. New Table
    - `appointment_cancellations` (Randevu İptalleri)
      - İptal edilen randevuların takibi
      - İptal nedenleri
      - Kısıtlama süreleri
    
  2. Security
    - RLS policies for cancellations table
*/

-- Create appointment cancellations table
CREATE TABLE appointment_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  cancellation_reason text NOT NULL,
  cancelled_at timestamptz DEFAULT now(),
  restriction_end_date date NOT NULL
);

-- Enable RLS
ALTER TABLE appointment_cancellations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Students can view their cancellations"
ON appointment_cancellations FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert cancellations"
ON appointment_cancellations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Create function to check if student can make appointment
CREATE OR REPLACE FUNCTION can_student_make_appointment(
  p_student_id uuid,
  p_lecturer_id uuid
) RETURNS boolean AS $$
DECLARE
  v_restriction_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM appointment_cancellations
    WHERE student_id = p_student_id 
    AND lecturer_id = p_lecturer_id
    AND restriction_end_date >= CURRENT_DATE
  ) INTO v_restriction_exists;
  
  RETURN NOT v_restriction_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;