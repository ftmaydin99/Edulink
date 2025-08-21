/*
  # Onaylanan ve İptal Edilen Randevular için Tablolar

  1. Yeni Tablolar
    - `approved_appointments` (Onaylanan Randevular)
      - Onaylanan randevuların detaylı bilgileri
    - `cancelled_appointments` (İptal Edilen Randevular)
      - İptal edilen randevuların detaylı bilgileri
    
  2. Güvenlik
    - Her tablo için RLS politikaları
    - Öğrenci ve öğretim görevlisi erişim kontrolleri
*/

-- Onaylanan Randevular tablosu
CREATE TABLE approved_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  student_id uuid NOT NULL REFERENCES students(id),
  lecturer_id uuid NOT NULL REFERENCES lecturers(id),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text,
  message text,
  student_name text,
  student_email text,
  student_faculty text,
  student_department text,
  student_year text,
  approved_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES lecturers(id)
);

-- İptal Edilen Randevular tablosu
CREATE TABLE cancelled_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  student_id uuid NOT NULL REFERENCES students(id),
  lecturer_id uuid NOT NULL REFERENCES lecturers(id),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text,
  message text,
  student_name text,
  student_email text,
  student_faculty text,
  student_department text,
  student_year text,
  cancelled_at timestamptz DEFAULT now(),
  cancelled_by uuid REFERENCES lecturers(id)
);

-- RLS'yi etkinleştir
ALTER TABLE approved_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancelled_appointments ENABLE ROW LEVEL SECURITY;

-- Onaylanan randevular için politikalar
CREATE POLICY "Students can view their approved appointments"
  ON approved_appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Lecturers can view their approved appointments"
  ON approved_appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = lecturer_id);

-- İptal edilen randevular için politikalar
CREATE POLICY "Students can view their cancelled appointments"
  ON cancelled_appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Lecturers can view their cancelled appointments"
  ON cancelled_appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = lecturer_id);

-- Trigger fonksiyonu
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Randevu onaylandığında
  IF NEW.status = 'onaylandı' AND OLD.status != 'onaylandı' THEN
    INSERT INTO approved_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, approved_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, auth.uid()
    );
  END IF;

  -- Randevu iptal edildiğinde
  IF NEW.status = 'iptal' AND OLD.status != 'iptal' THEN
    INSERT INTO cancelled_appointments (
      appointment_id, student_id, lecturer_id, date, start_time, end_time,
      subject, message, student_name, student_email, student_faculty,
      student_department, student_year, cancelled_by
    )
    VALUES (
      NEW.id, NEW.student_id, NEW.lecturer_id, NEW.date, NEW.start_time, NEW.end_time,
      NEW.subject, NEW.message, NEW.student_name, NEW.student_email, NEW.student_faculty,
      NEW.student_department, NEW.student_year, auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
CREATE TRIGGER appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();