/*
  # Add appointment_id to messages table

  1. Changes
    - Add `appointment_id` column to `messages` table
    - Add foreign key constraint to reference appointments table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add appointment_id column
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_appointment_id ON messages(appointment_id);