/*
  # Şifre değiştirme zorunluluğunu kaldır
  
  1. Değişiklikler
    - must_change_password sütununun varsayılan değerini false yap
    - Mevcut kayıtların must_change_password değerini false olarak güncelle
*/

-- must_change_password sütununun varsayılan değerini güncelle
ALTER TABLE lecturers 
ALTER COLUMN must_change_password SET DEFAULT false;

-- Mevcut kayıtları güncelle
UPDATE lecturers
SET must_change_password = false;