/*
  # Update rescheduled appointments text
  
  1. Changes
    - Update appointments that were rescheduled by lecturer and approved by student
    - Change subject from "Takip Toplantısı" to "Ertelenen Toplantı"
    - Update message accordingly
    
  2. Security
    - Maintain existing RLS policies
*/

-- Update subject for rescheduled appointments that were approved
UPDATE appointments
SET subject = 'Ertelenen Toplantı'
WHERE is_follow_up = true 
AND created_by_faculty = true 
AND status = 'onaylandı'
AND related_to_appointment_id IS NOT NULL;

-- Update message for rescheduled appointments that were approved
UPDATE appointments
SET message = 'Akademisyen tarafından oluşturulan ertelenen randevu'
WHERE is_follow_up = true 
AND created_by_faculty = true 
AND status = 'onaylandı'
AND related_to_appointment_id IS NOT NULL;