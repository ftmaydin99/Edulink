/*
  # Add status column to appointments table
  
  1. Changes
    - Add status column with check constraint
    - Set default value to 'bekliyor'
    - Add constraint to ensure valid status values
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add status column if it doesn't exist
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'bekliyor'
CHECK (status IN ('bekliyor', 'onaylandı', 'iptal'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Update existing appointments to have 'bekliyor' status if null
UPDATE appointments
SET status = 'bekliyor'
WHERE status IS NULL;