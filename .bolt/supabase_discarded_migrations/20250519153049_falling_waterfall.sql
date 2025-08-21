/*
  # Clean up all users and related data
  
  1. Changes
    - Delete all appointments
    - Delete all availabilities
    - Delete all messages
    - Delete all students
    - Delete all lecturers
    
  2. Security
    - Maintain existing RLS policies
*/

-- Delete all related data first
DELETE FROM appointments;
DELETE FROM availabilities;
DELETE FROM messages;
DELETE FROM students;
DELETE FROM lecturers;

-- Delete all auth.users (requires superuser privileges)
DELETE FROM auth.users;