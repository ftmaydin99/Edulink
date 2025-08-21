/*
  # Add update policy for student appointments
  
  1. Changes
    - Allow students to update their own appointments
    - Only allow updating status to 'iptal'
    - Restrict updates to pending or approved appointments
    
  2. Security
    - Only allow students to update their own appointments
    - Maintain existing RLS policies
*/

-- Drop existing update policy if exists
DROP POLICY IF EXISTS "Students can update their appointments" ON appointments;

-- Create new update policy for students
CREATE POLICY "Students can update their appointments"
ON appointments FOR UPDATE
TO authenticated
USING (
  auth.uid() = student_id AND
  status IN ('bekliyor', 'onaylandı')
)
WITH CHECK (
  auth.uid() = student_id AND
  status = 'iptal'
);