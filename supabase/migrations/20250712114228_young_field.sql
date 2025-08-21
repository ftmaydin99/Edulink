/*
  # E-posta Trigger'ını Kaldır

  Database trigger'ı kaldırıp frontend'den direkt e-posta gönderimi yapacağız.
*/

-- Trigger'ı kaldır
DROP TRIGGER IF EXISTS appointment_email_notification ON appointments;

-- Function'ı kaldır  
DROP FUNCTION IF EXISTS trigger_appointment_email();

-- Debug için log ekle
INSERT INTO debug_logs (function_name, message, details) 
VALUES ('system_update', 'E-posta trigger kaldırıldı, frontend gönderim aktif', '{}');