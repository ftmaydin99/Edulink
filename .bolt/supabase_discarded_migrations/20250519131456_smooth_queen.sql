/*
  # Add avatar_url column to users tables
  
  1. Changes
    - Add avatar_url column to students and lecturers tables
    - Create storage bucket for profile photos
    
  2. Security
    - Enable RLS for storage bucket
    - Add policies for avatar uploads
*/

-- Add avatar_url column to students
ALTER TABLE students
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add avatar_url column to lecturers
ALTER TABLE lecturers
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true);

-- Enable RLS for storage bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND
  (auth.uid())::text = (SPLIT_PART(name, '/', 2))::text
);

-- Create policy to allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles' AND
  (auth.uid())::text = (SPLIT_PART(name, '/', 2))::text
);

-- Create policy to allow anyone to read avatars
CREATE POLICY "Anyone can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');