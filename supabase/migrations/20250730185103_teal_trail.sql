-- Recreate the trigger
DROP TRIGGER IF EXISTS update_appointment_student_info ON appointments;

CREATE TRIGGER update_appointment_student_info
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_student_info();