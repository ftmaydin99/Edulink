/*
  # Randevu tablosuna konu ve mesaj sütunları ekleme
  
  1. Değişiklikler
    - `subject` sütunu eklendi (randevu konusu)
    - `message` sütunu eklendi (ek mesaj/açıklama)
    
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS message text;