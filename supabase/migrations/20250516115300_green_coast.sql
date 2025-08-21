/*
  # Randevu durumu için yeni sütunlar
  
  1. Yeni Sütunlar
    - `notification_sent`: Bildirim gönderildi mi?
    - `processed_at`: İşlem tarihi
    - `processed_by`: İşlemi yapan öğretim görevlisi
    
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

-- Yeni sütunları ekle
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS processed_at timestamptz,
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES lecturers(id);

-- Mevcut randevuları güncelle
UPDATE appointments
SET 
  notification_sent = false,
  processed_at = CASE 
    WHEN status != 'bekliyor' THEN created_at
    ELSE NULL
  END,
  processed_by = CASE 
    WHEN status != 'bekliyor' THEN lecturer_id
    ELSE NULL
  END;

-- Trigger fonksiyonu oluştur
CREATE OR REPLACE FUNCTION update_appointment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    NEW.processed_at = CURRENT_TIMESTAMP;
    NEW.processed_by = NEW.lecturer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
DROP TRIGGER IF EXISTS appointment_status_update ON appointments;
CREATE TRIGGER appointment_status_update
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_appointment_status();