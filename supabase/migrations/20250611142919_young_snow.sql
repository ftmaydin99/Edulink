-- Akademisyen tarafından ertelenen randevularda "Ertelenen Toplantı" olarak güncelle
UPDATE appointments
SET subject = 'Ertelenen Toplantı'
WHERE is_follow_up = true 
AND created_by_faculty = true 
AND rescheduled_date IS NOT NULL;

-- Akademisyen tarafından ertelenen randevularda mesajı güncelle
UPDATE appointments
SET message = 'Akademisyen tarafından oluşturulan ertelenen randevu'
WHERE is_follow_up = true 
AND created_by_faculty = true 
AND rescheduled_date IS NOT NULL;