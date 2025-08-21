/*
  # Randevu onaylama trigger fonksiyonu güncellemesi
  
  1. Değişiklikler
    - Trigger fonksiyonunu debug logları ile güncelle
    - Hata yakalama ve raporlama mekanizmasını geliştir
    - Transaction yönetimini iyileştir
    
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

-- Mevcut trigger ve fonksiyonları temizle
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
DROP FUNCTION IF EXISTS handle_appointment_status_change();

-- Debug log tablosu
CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  function_name text,
  message text,
  details jsonb
);

-- Yeni trigger fonksiyonu
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_log_id uuid;
BEGIN
  -- Debug log başlat
  INSERT INTO debug_logs (function_name, message, details)
  VALUES ('handle_appointment_status_change', 'Function started', jsonb_build_object(
    'old_status', OLD.status,
    'new_status', NEW.status,
    'appointment_id', NEW.id
  )) RETURNING id INTO v_log_id;

  -- Mevcut kullanıcı ID'sini al
  v_user_id := auth.uid();
  
  -- Kullanıcı kontrolü
  IF v_user_id IS NULL THEN
    -- Log ekle
    INSERT INTO debug_logs (function_name, message, details)
    VALUES ('handle_appointment_status_change', 'Error: Unauthorized operation', jsonb_build_object(
      'error', 'No user ID found'
    ));
    
    RAISE EXCEPTION 'Unauthorized operation';
  END IF;

  -- Randevu onaylandığında
  IF NEW.status = 'onaylandı' THEN
    -- Debug log
    INSERT INTO debug_logs (function_name, message, details)
    VALUES ('handle_appointment_status_change', 'Processing approved appointment', jsonb_build_object(
      'appointment_id', NEW.id,
      'user_id', v_user_id
    ));

    -- Önce varsa eski kaydı sil
    DELETE FROM approved_appointments WHERE appointment_id = NEW.id;
    
    -- Yeni kaydı ekle
    INSERT INTO approved_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, approved_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, v_user_id
    );

    -- Başarılı log
    INSERT INTO debug_logs (function_name, message, details)
    VALUES ('handle_appointment_status_change', 'Successfully added approved appointment', jsonb_build_object(
      'appointment_id', NEW.id,
      'approved_by', v_user_id
    ));
  END IF;

  -- Randevu iptal edildiğinde
  IF NEW.status = 'iptal' THEN
    -- Debug log
    INSERT INTO debug_logs (function_name, message, details)
    VALUES ('handle_appointment_status_change', 'Processing cancelled appointment', jsonb_build_object(
      'appointment_id', NEW.id,
      'user_id', v_user_id
    ));

    -- Önce varsa eski kaydı sil
    DELETE FROM cancelled_appointments WHERE appointment_id = NEW.id;
    
    -- Yeni kaydı ekle
    INSERT INTO cancelled_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, cancelled_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, v_user_id
    );

    -- Başarılı log
    INSERT INTO debug_logs (function_name, message, details)
    VALUES ('handle_appointment_status_change', 'Successfully added cancelled appointment', jsonb_build_object(
      'appointment_id', NEW.id,
      'cancelled_by', v_user_id
    ));
  END IF;

  -- Final başarı logu
  INSERT INTO debug_logs (function_name, message, details)
  VALUES ('handle_appointment_status_change', 'Function completed successfully', jsonb_build_object(
    'appointment_id', NEW.id,
    'final_status', NEW.status
  ));

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata logu
    INSERT INTO debug_logs (function_name, message, details)
    VALUES ('handle_appointment_status_change', 'Error occurred', jsonb_build_object(
      'error', SQLERRM,
      'appointment_id', NEW.id,
      'status', NEW.status
    ));
    
    RAISE EXCEPTION 'Error in handle_appointment_status_change: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();

-- Debug log tablosu için RLS
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Debug logları için politika
CREATE POLICY "Only authenticated users can view debug logs"
ON debug_logs FOR SELECT
TO authenticated
USING (true);