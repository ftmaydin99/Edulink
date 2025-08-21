/*
  # Add lecturer restriction policy

  1. Changes
    - Add RLS policy to allow lecturers to insert restrictions
    - Policy ensures lecturers can only insert restrictions where they are the lecturer_id

  2. Security
    - Enable RLS on appointment_restrictions table (if not already enabled)
    - Add policy for authenticated users to insert restrictions
    - Policy checks that the authenticated user is the lecturer creating the restriction
*/

-- Add policy for lecturers to insert restrictions
CREATE POLICY "Lecturers can create restrictions"
ON public.appointment_restrictions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = lecturer_id);