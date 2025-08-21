-- E-posta trigger'ını yeniden oluştur
DROP TRIGGER IF EXISTS appointment_email_trigger ON appointments;
DROP FUNCTION IF EXISTS send_appointment_email();

-- E-posta gönderme fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION send_appointment_email()
RETURNS TRIGGER AS $$
DECLARE
    lecturer_data RECORD;
    student_data RECORD;
    email_payload JSONB;
BEGIN
    -- Debug log ekle
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
        'trigger_fired',
        'Appointment email trigger çalıştı',
        jsonb_build_object(
            'appointment_id', NEW.id,
            'student_id', NEW.student_id,
            'lecturer_id', NEW.lecturer_id,
            'status', NEW.status,
            'trigger_event', TG_OP
        )
    );

    -- Sadece yeni appointment oluşturulduğunda çalış
    IF TG_OP = 'INSERT' THEN
        -- Lecturer bilgilerini al
        SELECT name, email INTO lecturer_data
        FROM lecturers 
        WHERE id = NEW.lecturer_id;

        -- Student bilgilerini al
        SELECT 
            name, 
            email,
            f.name as faculty_name,
            d.name as department_name,
            year
        INTO student_data
        FROM students s
        LEFT JOIN faculties f ON s.faculty_id = f.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.id = NEW.student_id;

        -- E-posta payload'ını hazırla
        email_payload := jsonb_build_object(
            'emailData', jsonb_build_object(
                'student_name', student_data.name,
                'student_email', student_data.email,
                'lecturer_name', lecturer_data.name,
                'lecturer_email', lecturer_data.email,
                'date', NEW.date,
                'start_time', NEW.start_time,
                'end_time', NEW.end_time,
                'subject', NEW.subject,
                'message', NEW.message,
                'student_faculty', student_data.faculty_name,
                'student_department', student_data.department_name,
                'student_year', student_data.year
            )
        );

        -- Debug log ekle
        INSERT INTO debug_logs (function_name, message, details)
        VALUES (
            'email_payload_prepared',
            'E-posta payload hazırlandı',
            email_payload
        );

        -- Edge function'ı çağır
        PERFORM
            net.http_post(
                url := 'https://ixjhqfqjpnqnqfqjpnqn.supabase.co/functions/v1/send-appointment-email',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4amhxZnFqcG5xbnFmcWpwbnFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDI2NzU5NCwiZXhwIjoyMDQ5ODQzNTk0fQ.Ej4Ej4Ej4Ej4Ej4Ej4Ej4Ej4Ej4Ej4Ej4Ej4Ej4"}'::jsonb,
                body := email_payload
            );

        -- Debug log ekle
        INSERT INTO debug_logs (function_name, message, details)
        VALUES (
            'http_post_called',
            'Edge function çağrıldı',
            jsonb_build_object(
                'appointment_id', NEW.id,
                'timestamp', NOW()
            )
        );

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;