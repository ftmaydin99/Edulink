/*
  # Update RLS policies for students table
  
  1. Changes
    - Add policy to allow students to insert their own record during registration
    - Update existing select policy for better clarity
  
  2. Security
    - Students can only insert their own record where auth.uid matches id
    - Students can only view their own profile (existing policy)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their own profile" ON students;

-- Create new policies
CREATE POLICY "Students can view their own profile"
ON public.students
FOR SELECT
TO public
USING (auth.uid() = id);

CREATE POLICY "Students can insert their own profile"
ON public.students
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);