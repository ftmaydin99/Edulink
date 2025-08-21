-- Trigger'ın çalışıp çalışmadığını test etmek için

-- 1. Trigger'ın var olup olmadığını kontrol et
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'appointment_email_trigger';

-- 2. Function'ın var olup olmadığını kontrol et
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'send_appointment_email_trigger';

-- 3. Debug loglarını kontrol et
SELECT 
  created_at,
  function_name,
  message,
  details
FROM debug_logs 
WHERE function_name = 'send_appointment_email_trigger'
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Son oluşturulan randevuları kontrol et
SELECT 
  id,
  student_id,
  lecturer_id,
  date,
  start_time,
  subject,
  status,
  created_at
FROM appointments 
ORDER BY created_at DESC 
LIMIT 5;