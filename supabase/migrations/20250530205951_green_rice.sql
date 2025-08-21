/*
  # Add notification system for new appointments
  
  1. Changes
    - Add is_seen_by_academic column to appointments table
    - Add index for better performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add is_seen_by_academic column
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS is_seen_by_academic boolean DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_is_seen ON appointments(lecturer_id, is_seen_by_academic);