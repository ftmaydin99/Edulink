-- Trigger'ı oluştur
CREATE TRIGGER appointment_email_trigger
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION send_appointment_email();