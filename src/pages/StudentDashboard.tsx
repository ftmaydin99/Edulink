import React, { useEffect, useState } from 'react';
import { Users, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

interface Student {
  name: string;
}

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  lecturer: {
    name: string;
    avatar_url?: string;
    faculties: {
      name: string;
    };
    departments: {
      name: string;
    };
  };
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    async function getStudentData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/ogrenci-giris');
        return;
      }

      const { data: studentData } = await supabase
        .from('students')
        .select('name')
        .eq('id', user.id)
        .single();

      if (studentData) {
        setStudent(studentData);
      }

      // Fetch upcoming appointments
      const tomorrow = addDays(new Date(), 1);
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          start_time,
          end_time,
          subject,
          lecturer_id
        `)
        .eq('student_id', user.id)
        .eq('status', 'onaylandı')
        .lte('date', format(tomorrow, 'yyyy-MM-dd'))
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (appointments) {
        // Fetch lecturer details for each appointment
        const appointmentsWithLecturers = await Promise.all(
          appointments.map(async (appointment) => {
            const { data: lecturerData } = await supabase
              .from('lecturers')
              .select(`
                name,
                avatar_url,
                faculties (name),
                departments (name)
              `)
              .eq('id', appointment.lecturer_id)
              .single();

            return {
              ...appointment,
              lecturer: lecturerData
            };
          })
        );

        setUpcomingAppointments(appointmentsWithLecturers);
      }
    }

    getStudentData();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header userName={student?.name} userRole="student" />

      <main className="flex-grow">
        <div className="bg-[#005baa]/5 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Sakarya Üniversitesi İşletme Fakültesi
            </h1>
            <h2 className="text-3xl font-bold mt-2 text-gray-900">
              Randevu Sistemi
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Öğrenciler ve akademisyenler arasında iletişimi kolaylaştıran online randevu sistemi
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <a 
                href="/randevu-al" 
                className="bg-[#005baa] text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-[#0070d4] transition-colors shadow-md"
              >
                Randevu Al
              </a>
              <a 
                href="/randevularim" 
                className="bg-white text-[#005baa] px-8 py-3 rounded-md text-lg font-medium border-2 border-[#005baa] hover:bg-gray-50 transition-colors shadow-md"
              >
                Randevularımı Görüntüle
              </a>
            </div>
          </div>
        </div>

        {/* Yaklaşan Randevular */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Yaklaşan Randevular</h2>
          <div className="grid grid-cols-1 gap-4">
            {upcomingAppointments.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
                Bugün veya yarın için onaylanmış randevunuz bulunmamaktadır
              </div>
            ) : (
              upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#005baa]/10 flex items-center justify-center overflow-hidden">
                        {appointment.lecturer.avatar_url ? (
                          <img
                            src={appointment.lecturer.avatar_url}
                            alt={appointment.lecturer.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[#005baa] text-xl font-bold">
                            {appointment.lecturer.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {appointment.lecturer.name}
                        </h3>
                        <div className="text-sm text-gray-500">
                          <p>{appointment.lecturer.faculties?.name}</p>
                          <p>{appointment.lecturer.departments?.name}</p>
                        </div>
                        <p className="mt-2 text-gray-700">{appointment.subject}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {format(parseISO(appointment.date), 'd MMMM yyyy', { locale: tr })}
                      </p>
                      <p className="font-medium text-gray-900">
                        {appointment.start_time} - {appointment.end_time}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <Users className="h-12 w-12 text-[#005baa]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Kolay Randevu Sistemi</h3>
              <p className="text-gray-600">
                Akademisyenlerin müsait olduğu zamanları görebilir ve kolayca randevu alabilirsiniz
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <Users className="h-12 w-12 text-[#005baa]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Akademisyen Profilleri</h3>
              <p className="text-gray-600">
                Tüm akademisyenlere tek bir yerden ulaşabilirsiniz
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <Clock className="h-12 w-12 text-[#005baa]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Randevu Takibi</h3>
              <p className="text-gray-600">
                Onaylanan, bekleyen ve geçmiş randevularınızı kolayca takip edebilirsiniz
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-[#005baa]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Durum Bildirimleri</h3>
              <p className="text-gray-600">
                Randevularınızın durumu değiştiğinde anında haberdar olursunuz
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}