-- E-posta sistemini debug et
SELECT 
  created_at,
  function_name,
  message,
  details
FROM debug_logs 
WHERE created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC 
LIMIT 10;

-- Trigger'ları kontrol et
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%appointment%';

-- Fonksiyonları kontrol et
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%appointment%';