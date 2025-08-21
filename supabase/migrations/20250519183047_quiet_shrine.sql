/*
  # Add avatar support with proper policy handling
  
  1. Changes
    - Add avatar_url columns if they don't exist
    - Create storage bucket for profiles
    - Create or replace storage policies
    
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Create or replace storage policies
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