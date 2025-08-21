/*
  # Fix appointment status trigger
  
  1. Changes
    - Simplify trigger function
    - Add explicit status checks
    - Ensure proper status updates
    - Add better error handling
*/

-- Mevcut trigger ve fonksiyonları temizle
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
DROP FUNCTION IF EXISTS handle_appointment_status_change();

-- Yeni trigger fonksiyonu
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Mevcut kullanıcı ID'sini al
  v_user_id := auth.uid();
  
  -- Kullanıcı kontrolü
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized operation';
  END IF;

  -- Sadece 'bekliyor' durumundan diğer durumlara geçişe izin ver
  IF OLD.status != 'bekliyor' THEN
    RAISE EXCEPTION 'Only pending appointments can be updated';
  END IF;

  -- Randevu onaylandığında
  IF NEW.status = 'onaylandı' THEN
    -- Onaylanan randevular tablosuna ekle
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
  END IF;

  -- Randevu iptal edildiğinde
  IF NEW.status = 'iptal' THEN
    -- İptal edilen randevular tablosuna ekle
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();