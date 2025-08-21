/*
  # Randevu Onaylama Sistemi Düzeltmesi
  
  1. Değişiklikler
    - Trigger fonksiyonunu basitleştir ve hata kontrolü ekle
    - Onaylanan ve iptal edilen randevular için indeksler ekle
    - RLS politikalarını güncelle
    
  2. Güvenlik
    - Trigger fonksiyonu SECURITY DEFINER olarak çalışacak
    - Her tabloda RLS aktif kalacak
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

  -- Randevu onaylandığında
  IF NEW.status = 'onaylandı' THEN
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
  END IF;

  -- Randevu iptal edildiğinde
  IF NEW.status = 'iptal' THEN
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
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in handle_appointment_status_change: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();

-- İndeksleri güncelle
DROP INDEX IF EXISTS idx_approved_appointments_lecturer_id;
DROP INDEX IF EXISTS idx_cancelled_appointments_lecturer_id;
DROP INDEX IF EXISTS idx_approved_appointments_appointment_id;
DROP INDEX IF EXISTS idx_cancelled_appointments_appointment_id;

CREATE INDEX idx_approved_appointments_lecturer_id ON approved_appointments(lecturer_id);
CREATE INDEX idx_cancelled_appointments_lecturer_id ON cancelled_appointments(lecturer_id);
CREATE UNIQUE INDEX idx_approved_appointments_appointment_id ON approved_appointments(appointment_id);
CREATE UNIQUE INDEX idx_cancelled_appointments_appointment_id ON cancelled_appointments(appointment_id);

-- RLS politikalarını güncelle
ALTER TABLE approved_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancelled_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecturers can view their approved appointments" ON approved_appointments;
DROP POLICY IF EXISTS "Lecturers can view their cancelled appointments" ON cancelled_appointments;

CREATE POLICY "Lecturers can view their approved appointments"
ON approved_appointments FOR SELECT
TO authenticated
USING (auth.uid() = lecturer_id);

CREATE POLICY "Lecturers can view their cancelled appointments"
ON cancelled_appointments FOR SELECT
TO authenticated
USING (auth.uid() = lecturer_id);