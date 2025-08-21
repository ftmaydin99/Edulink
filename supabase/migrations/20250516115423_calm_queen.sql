/*
  # Fix appointment status trigger
  
  1. Changes
    - Drop existing trigger and function
    - Create new trigger function with proper error handling
    - Add new trigger with better conditions
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS appointment_status_update ON appointments;
DROP FUNCTION IF EXISTS update_appointment_status();

-- Create new trigger function
CREATE OR REPLACE FUNCTION update_appointment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update processed_at and processed_by if status is changing
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.processed_at = CURRENT_TIMESTAMP;
    NEW.processed_by = auth.uid();
    NEW.notification_sent = FALSE;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating appointment status: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER appointment_status_update
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_status();