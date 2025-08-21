/*
  # Fix appointment types based on creation method
  
  1. Changes
    - Update follow-up appointments created via "Yeni Randevu Ver" to have "Takip Toplantısı"
    - Update rescheduled appointments created via "Randevuyu Ertele" to have "Ertelenen Toplantı"
    
  2. Logic
    - Follow-up appointments (is_follow_up = true, created_by_faculty = true) without related_to_appointment_id = "Takip Toplantısı"
    - Rescheduled appointments (created from reschedule process) = "Ertelenen Toplantı"
*/

-- Update follow-up appointments created via "Yeni Randevu Ver" button
-- These have is_follow_up = true, created_by_faculty = true, but no related_to_appointment_id
UPDATE appointments
SET 
  subject = 'Takip Toplantısı',
  message = 'Akademisyen tarafından yeni bir toplantı oluşturulmuştur'
WHERE 
  is_follow_up = true 
  AND created_by_faculty = true 
  AND related_to_appointment_id IS NULL
  AND subject != 'Takip Toplantısı';

-- Update rescheduled appointments that were approved by students
-- These have is_follow_up = true, created_by_faculty = true, and related_to_appointment_id IS NOT NULL
UPDATE appointments
SET 
  subject = 'Ertelenen Toplantı',
  message = 'Toplantı akademisyen tarafından ertelenmiştir'
WHERE 
  is_follow_up = true 
  AND created_by_faculty = true 
  AND related_to_appointment_id IS NOT NULL
  AND status = 'onaylandı'
  AND subject != 'Ertelenen Toplantı';