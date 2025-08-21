/*
  # Availabilities tablosunu güncelle
  
  1. Değişiklikler
    - day_of_week sütununu kaldır
    - date sütunu ekle
    
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

-- Mevcut tabloyu sil
DROP TABLE IF EXISTS availabilities;

-- Yeni tabloyu oluştur
CREATE TABLE availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- RLS politikalarını yeniden ekle
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availabilities"
  ON availabilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Lecturers can manage their availabilities"
  ON availabilities FOR ALL
  USING (auth.uid()::uuid = lecturer_id);