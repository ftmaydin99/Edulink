/*
  # Update lecturers table with initial data
  
  1. Changes
    - Remove existing test data
    - Add real lecturer records
    
  2. Security
    - Maintain existing RLS policies
*/

-- Remove existing test data
TRUNCATE TABLE lecturers CASCADE;

-- Add new lecturers
INSERT INTO lecturers (name, email, must_change_password)
VALUES 
  ('Prof. Dr. Ahmet Yılmaz', 'ahmet.yilmaz@sakarya.edu.tr', false),
  ('Doç. Dr. Ayşe Demir', 'ayse.demir@sakarya.edu.tr', false),
  ('Dr. Öğr. Üyesi Mehmet Kaya', 'mehmet.kaya@sakarya.edu.tr', false),
  ('Dr. Öğr. Üyesi Zeynep Arslan', 'zeynep.arslan@sakarya.edu.tr', false),
  ('Öğr. Gör. Dr. Faruk Durmaz', 'faruk.durmaz@sakarya.edu.tr', false),
  ('Prof. Dr. Ali Can', 'ali.can@sakarya.edu.tr', false),
  ('Doç. Dr. Fatma Yıldız', 'fatma.yildiz@sakarya.edu.tr', false),
  ('Dr. Öğr. Üyesi Mustafa Şahin', 'mustafa.sahin@sakarya.edu.tr', false),
  ('Dr. Öğr. Üyesi Esra Güneş', 'esra.gunes@sakarya.edu.tr', false),
  ('Öğr. Gör. Emre Kılıç', 'emre.kilic@sakarya.edu.tr', false);