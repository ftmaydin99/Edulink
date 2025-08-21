-- Edge Function çalışma durumunu kontrol et
SELECT 
  created_at,
  function_name,
  message,
  details
FROM debug_logs 
WHERE function_name IN ('send-appointment-email', 'send-edulink-notification')
  AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- Ayrıca genel e-posta loglarını da kontrol et
SELECT 
  created_at,
  function_name,
  message,
  details->'mode' as email_mode,
  details->'student_email_sent' as student_email,
  details->'lecturer_email_sent' as lecturer_email
FROM debug_logs 
WHERE message ILIKE '%e-posta%' OR message ILIKE '%email%'
  AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;