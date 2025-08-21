/*
  # Fix appointment labels and descriptions
  
  1. Changes
    - Ensure follow-up appointments have correct labels
    - Ensure rescheduled appointments have correct labels
    - Update existing data to match requirements
    
  2. Logic
    - "Yeni Randevu Ver" → "Takip Toplantısı" + "Akademisyen tarafından oluşturuldu"
    - "Randevuyu Ertele" → "Ertelenen Toplantı" + "Akademisyen tarafından oluşturuldu"
*/

-- Update follow-up appointments created via "Yeni Randevu Ver" button
-- These should have subject = 'Takip Toplantısı'
UPDATE appointments
SET 
  subject = 'Takip Toplantısı',
  message = 'Akademisyen tarafından yeni bir toplantı oluşturulmuştur'
WHERE 
  is_follow_up = true 
  AND created_by_faculty = true 
  AND related_to_appointment_id IS NULL;

-- Update rescheduled appointments that were approved by students
-- These should have subject = 'Ertelenen Toplantı'
UPDATE appointments
SET 
  subject = 'Ertelenen Toplantı',
  message = 'Toplantı akademisyen tarafından ertelenmiştir'
WHERE 
  status = 'onaylandı'
  AND rescheduled_date IS NOT NULL
  AND rescheduled_start_time IS NOT NULL
  AND rescheduled_end_time IS NOT NULL;

-- Also update any appointments that were created from reschedule process
UPDATE appointments
SET 
  subject = 'Ertelenen Toplantı',
  message = 'Toplantı akademisyen tarafından ertelenmiştir'
WHERE 
  is_follow_up = true 
  AND created_by_faculty = true 
  AND related_to_appointment_id IS NOT NULL
  AND status = 'onaylandı';