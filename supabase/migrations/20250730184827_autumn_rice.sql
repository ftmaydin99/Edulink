-- Mevcut trigger'ları kontrol et
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%email%' OR trigger_name LIKE '%appointment%';

-- Appointment tablosundaki trigger'ları kontrol et
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'appointments';

-- Debug: Son eklenen appointment'ları kontrol et
SELECT 
    id,
    created_at,
    student_name,
    lecturer_id,
    status
FROM appointments 
ORDER BY created_at DESC 
LIMIT 3;