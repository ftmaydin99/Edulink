/*
  # Add avatar URL column to students and lecturers tables
  
  1. Changes
    - Add avatar_url column to students table
    - Add avatar_url column to lecturers table
    - Create storage bucket for profile photos
    - Add storage policies for profile photos
    
  2. Security
    - Only allow users to upload their own photos
    - Allow public read access to profile photos
*/

-- Add avatar_url column to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add avatar_url column to lecturers table
ALTER TABLE lecturers
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for profile photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile photos
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND 
  (name = 'avatars/' || auth.uid() || '.jpg' OR
   name = 'avatars/' || auth.uid() || '.jpeg' OR
   name = 'avatars/' || auth.uid() || '.png' OR
   name = 'avatars/' || auth.uid() || '.gif')
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles' AND 
  (name = 'avatars/' || auth.uid() || '.jpg' OR
   name = 'avatars/' || auth.uid() || '.jpeg' OR
   name = 'avatars/' || auth.uid() || '.png' OR
   name = 'avatars/' || auth.uid() || '.gif')
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');