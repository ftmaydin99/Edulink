/*
  # Otomatik randevu iptal sistemi
  
  1. Değişiklikler
    - Süresi geçen randevuları otomatik iptal etmek için fonksiyon
    - Fonksiyonu çağıracak trigger
    
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

-- Otomatik iptal fonksiyonu
CREATE OR REPLACE FUNCTION auto_cancel_expired_appointments()
RETURNS trigger AS $$
BEGIN
  -- Süresi geçmiş ve bekleyen randevuları iptal et
  UPDATE appointments
  SET 
    status = 'iptal',
    processed_at = CURRENT_TIMESTAMP,
    processed_by = lecturer_id
  WHERE 
    status = 'bekliyor' 
    AND (date < CURRENT_DATE 
      OR (date = CURRENT_DATE AND end_time < CURRENT_TIME));

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Her saat başı çalışacak trigger
CREATE OR REPLACE FUNCTION check_expired_appointments()
RETURNS void AS $$
BEGIN
  PERFORM auto_cancel_expired_appointments();
END;
$$ LANGUAGE plpgsql;