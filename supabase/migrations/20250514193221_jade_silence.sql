/*
  # Add initial lecturer data and policies

  1. Security
    - Add policy for lecturers to manage their own profile
  2. Data
    - Insert initial lecturer records with temporary passwords
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Lecturers can manage their own profile" ON public.lecturers;

-- Create the policy
CREATE POLICY "Lecturers can manage their own profile"
ON public.lecturers
FOR ALL
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Insert initial lecturer data
INSERT INTO public.lecturers (name, email, password, must_change_password)
VALUES 
  ('Dr. Ahmet Yılmaz', 'ahmet.yilmaz@sakarya.edu.tr', 'temp123', true),
  ('Dr. Ayşe Demir', 'ayse.demir@sakarya.edu.tr', 'temp123', true),
  ('Prof. Dr. Mehmet Kaya', 'mehmet.kaya@sakarya.edu.tr', 'temp123', true),
  ('Doç. Dr. Zeynep Arslan', 'zeynep.arslan@sakarya.edu.tr', 'temp123', true),
  ('Dr. Ali Can', 'ali.can@sakarya.edu.tr', 'temp123', true);