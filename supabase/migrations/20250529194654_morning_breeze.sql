-- Add meeting status columns
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS meeting_status text CHECK (meeting_status IN ('yapıldı', 'yapılmadı')),
ADD COLUMN IF NOT EXISTS meeting_note text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_meeting_status 
ON appointments(meeting_status);