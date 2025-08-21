/*
  # Randevu Erteleme Sistemi
  
  1. Yeni Sütunlar
    - `rescheduled_date`: Yeni tarih
    - `rescheduled_start_time`: Yeni başlangıç saati
    - `rescheduled_end_time`: Yeni bitiş saati
    - `reschedule_reason`: Erteleme nedeni
    
  2. Durum Güncellemesi
    - Yeni status: 'awaiting_student_approval'
    
  3. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

-- Yeni sütunları ekle
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS rescheduled_date date,
ADD COLUMN IF NOT EXISTS rescheduled_start_time time,
ADD COLUMN IF NOT EXISTS rescheduled_end_time time,
ADD COLUMN IF NOT EXISTS reschedule_reason text;

-- Status constraint'ini güncelle
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('bekliyor', 'onaylandı', 'iptal', 'awaiting_student_approval'));

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_appointments_reschedule_status 
ON appointments(status) WHERE status = 'awaiting_student_approval';