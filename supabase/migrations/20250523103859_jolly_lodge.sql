/*
  # Remove appointment cancellations table
  
  1. Changes
    - Drop appointment_cancellations table
    - Drop related function
*/

-- Drop function first
DROP FUNCTION IF EXISTS can_student_make_appointment;

-- Drop table
DROP TABLE IF EXISTS appointment_cancellations;