/*
  # Add meeting status tracking
  
  1. Changes
    - Add meeting_status column to appointments table
    - Add meeting_note column for optional notes
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add meeting status columns
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS meeting_status text CHECK (meeting_status IN ('yapıldı', 'yapılmadı')),
ADD COLUMN IF NOT EXISTS meeting_note text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_meeting_status 
ON appointments(meeting_status);