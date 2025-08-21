/*
  # Randevu tablosunu güncelle
  
  1. Değişiklikler
    - processed_at ve processed_by sütunları eklendi
    - Trigger fonksiyonu güncellendi
    - Gereksiz tablolar kaldırıldı
    
  2. Güvenlik
    - RLS politikaları korundu
*/

-- Randevu tablosuna işlem bilgisi sütunları ekle
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS processed_at timestamptz,
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES lecturers(id);

-- Gereksiz tabloları kaldır
DROP TABLE IF EXISTS approved_appointments CASCADE;
DROP TABLE IF EXISTS cancelled_appointments CASCADE;

-- Trigger fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Mevcut kullanıcı ID'sini al
  v_user_id := auth.uid();
  
  -- Kullanıcı kontrolü
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Yetkisiz işlem';
  END IF;

  -- İşlem bilgilerini güncelle
  NEW.processed_at := CURRENT_TIMESTAMP;
  NEW.processed_by := v_user_id;

  -- Hata logu
  INSERT INTO debug_logs (function_name, message, details)
  VALUES (
    'handle_appointment_status_change',
    'Randevu durumu güncellendi',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'processed_by', v_user_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
CREATE TRIGGER appointment_status_change
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_change();