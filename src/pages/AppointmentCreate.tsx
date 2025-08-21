import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO, addDays, startOfWeek, isSameDay, addMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Clock4, 
  CheckCircle2, 
  XCircle,
  Filter,
  User,
  Building2,
  BookOpen,
  GraduationCap,
  MessageCircle,
  ArrowLeft,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
}

interface Availability {
  id: string;
  lecturer_id: string;
  date: string;
  time_slots: TimeSlot[];
}

interface Appointment {
  start_time: string;
  end_time: string;
  status: string;
}

interface Faculty {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface Lecturer {
  id: string;
  name: string;
  faculty_id: string;
  department_id: string;
  availabilities: Availability[];
  is_restricted?: boolean;
  restriction_end_date?: string;
}

export function AppointmentCreate() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [weekStartDate, setWeekStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [student, setStudent] = useState<{ name: string } | null>(null);
  
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  useEffect(() => {
    checkStudentProfile();
    fetchFaculties();
  }, []);

  useEffect(() => {
    if (selectedFaculty) {
      fetchDepartments();
      setSelectedDepartment('');
      setSelectedLecturer('');
    }
  }, [selectedFaculty]);

  useEffect(() => {
    if (selectedFaculty && selectedDepartment) {
      fetchLecturers();
      setSelectedLecturer('');
    }
  }, [selectedDepartment]);

  const fetchFaculties = async () => {
    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setFaculties(data || []);
    } catch (err) {
      console.error('Error fetching faculties:', err);
      setError('Fakülteler yüklenirken bir hata oluştu');
    }
  };

  const fetchDepartments = async () => {
    if (!selectedFaculty) {
      setDepartments([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('faculty_id', selectedFaculty)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Bölümler yüklenirken bir hata oluştu');
    }
  };

  const checkStudentProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/ogrenci-giris');
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name')
        .eq('id', user.id)
        .single();

      if (studentError || !student) {
        setError('Öğrenci profiliniz bulunamadı. Lütfen önce kaydolun.');
        navigate('/ogrenci-giris?register=true');
        return;
      }

      setStudent(student);
    } catch (err) {
      console.error('Error checking student profile:', err);
      setError('Öğrenci profili kontrol edilirken bir hata oluştu');
    }
  };

  useEffect(() => {
    if (selectedLecturer && selectedDate) {
      fetchExistingAppointments();
    }
  }, [selectedLecturer, selectedDate]);

  useEffect(() => {
    if (selectedLecturer && selectedDate && existingAppointments) {
      fetchAvailableTimeSlots();
    }
  }, [selectedLecturer, selectedDate, existingAppointments]);

  const fetchLecturers = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Oturum bulunamadı');

      // Get restrictions for the current student
      const { data: restrictions, error: restrictionError } = await supabase
        .from('appointment_restrictions')
        .select('lecturer_id, end_date')
        .eq('student_id', user.id)
        .gte('end_date', format(new Date(), 'yyyy-MM-dd'));

      if (restrictionError) throw restrictionError;

      const restrictionMap = new Map();
      restrictions?.forEach(r => {
        restrictionMap.set(r.lecturer_id, r.end_date);
      });

      const query = supabase
        .from('lecturers')
        .select(`
          id,
          name,
          faculty_id,
          department_id,
          availabilities (
            id,
            date,
            time_slots
          )
        `)
        .order('name');

      if (selectedFaculty) {
        query.eq('faculty_id', selectedFaculty);
      }

      if (selectedDepartment) {
        query.eq('department_id', selectedDepartment);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('Seçilen kriterlere uygun akademisyen bulunmamaktadır');
        return;
      }

      // Add restriction information to lecturers
      const lecturersWithRestrictions = data.map(lecturer => ({
        ...lecturer,
        is_restricted: restrictionMap.has(lecturer.id),
        restriction_end_date: restrictionMap.get(lecturer.id)
      }));

      setLecturers(lecturersWithRestrictions);
      setError('');
    } catch (err) {
      console.error('Error fetching lecturers:', err);
      setError('Akademisyenler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAppointments = async () => {
    try {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('lecturer_id', selectedLecturer)
        .eq('date', selectedDateStr)
        .neq('status', 'iptal');

      if (error) throw error;
      
      setExistingAppointments(data || []);
    } catch (err) {
      console.error('Error fetching existing appointments:', err);
      setError('Mevcut randevular yüklenirken bir hata oluştu');
    }
  };

  const fetchAvailableTimeSlots = async () => {
    const lecturer = lecturers.find(l => l.id === selectedLecturer);
    if (!lecturer) return;

    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const availability = lecturer.availabilities.find(a => a.date === selectedDateStr);
    
    if (!availability || !availability.time_slots || availability.time_slots.length === 0) {
      setAvailableTimeSlots([]);
      return;
    }

    const slots = [];
    
    // Generate 30-minute slots for each time range
    for (const timeSlot of availability.time_slots) {
      let currentTime = parseISO(`2000-01-01T${timeSlot.start}`);
      const endTime = parseISO(`2000-01-01T${timeSlot.end}`);

      while (currentTime < endTime) {
        const timeSlotStr = format(currentTime, 'HH:mm');
        
        // Check if this slot conflicts with existing appointments
        const isBooked = existingAppointments.some(appointment => {
          const appointmentStart = parseISO(`2000-01-01T${appointment.start_time}`);
          const appointmentEnd = parseISO(`2000-01-01T${appointment.end_time}`);
          const slotEnd = addMinutes(currentTime, 30);
          
          return (currentTime < appointmentEnd && slotEnd > appointmentStart);
        });

        if (!isBooked) {
          slots.push(timeSlotStr);
        }
        
        currentTime = addMinutes(currentTime, 30);
      }
    }

    setAvailableTimeSlots(slots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLecturer || !selectedDate || !selectedTime || !subject.trim() || !message.trim()) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      // Check if student is restricted for this lecturer
      const { data: restrictions, error: restrictionError } = await supabase
        .from('appointment_restrictions')
        .select('*')
        .eq('student_id', user.id)
        .eq('lecturer_id', selectedLecturer)
        .gte('end_date', format(new Date(), 'yyyy-MM-dd'))
        .maybeSingle();

      if (restrictionError) throw restrictionError;

      if (restrictions) {
        const endDate = new Date(restrictions.end_date);
        throw new Error(`Bu akademisyene ${format(endDate, 'd MMMM yyyy', { locale: tr })} tarihine kadar randevu talebi gönderemezsiniz.`);
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id, name, email, faculty_id, department_id, year,
          faculties!faculty_id(name),
          departments!department_id(name)
        `)
        .eq('id', user.id)
        .single();

      if (studentError || !student) {
        setError('Öğrenci profiliniz bulunamadı. Lütfen önce kaydolun.');
        navigate('/ogrenci-giris?register=true');
        return;
      }

      // Calculate end time
      const startTimeDate = parseISO(`2000-01-01T${selectedTime}`);
      const endTimeDate = addMinutes(startTimeDate, 30);
      const endTime = format(endTimeDate, 'HH:mm');

      // Final availability check
      const { data: conflictCheck, error: conflictError } = await supabase
        .from('appointments')
        .select('id')
        .eq('lecturer_id', selectedLecturer)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('start_time', selectedTime)
        .neq('status', 'iptal');

      if (conflictError) throw conflictError;

      if (conflictCheck && conflictCheck.length > 0) {
        setError('Bu randevu saati başka bir öğrenci tarafından alındı. Lütfen başka bir saat seçin.');
        return;
      }

      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert([{
          student_id: user.id,
          lecturer_id: selectedLecturer,
          date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedTime,
          end_time: endTime,
          status: 'bekliyor',
          subject,
          message,
          student_name: student.name,
          student_email: student.email,
          student_faculty: student.faculties?.name || '',
          student_department: student.departments?.name || '',
          student_year: student.year
        }]);

      if (appointmentError) {
        if (appointmentError.message.includes('unique_lecturer_appointment')) {
          setError('Bu randevu saati başka bir öğrenci tarafından alındı. Lütfen başka bir saat seçin.');
          return;
        }
        throw appointmentError;
      }

      // E-posta gönderimi
      try {
        console.log('Randevu oluşturuldu, e-posta bildirimi trigger ile gönderilecek');
        
        // Test için debug log ekle
        await supabase
          .from('debug_logs')
          .insert({
            function_name: 'appointment_created_frontend',
            message: 'Randevu frontend\'den oluşturuldu',
            details: {
              appointment_date: format(selectedDate, 'yyyy-MM-dd'),
              appointment_time: selectedTime,
              lecturer_id: selectedLecturer,
              student_id: user.id,
              timestamp: new Date().toISOString()
            }
          });
      } catch (emailError) {
        console.error('E-posta gönderim hatası:', emailError);
        // E-posta hatası randevu oluşturmayı engellemez
      }

      // Başarı mesajı göster
      alert('Randevu talebiniz başarıyla gönderildi! E-posta adresinize onay mesajı gönderilmiştir.');

      navigate('/randevularim');
    } catch (err) {
      console.error('Appointment creation error:', err);
      setError(err.message || 'Randevu oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  const isDateAvailable = (date: Date) => {
    const lecturer = lecturers.find(l => l.id === selectedLecturer);
    if (!lecturer) return false;

    const dateStr = format(date, 'yyyy-MM-dd');
    return lecturer.availabilities.some(a => a.date === dateStr && a.time_slots && a.time_slots.length > 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        userName={student?.name}
        userRole="student"
      />
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Randevu Al</h1>
            <p className="mt-1 text-sm text-gray-500">
              Akademisyen seçip uygun bir zaman belirleyin
            </p>
          </div>
          <a href="/ogrenci-panel" className="flex items-center text-[#005baa] hover:text-[#0070d4] transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Geri Dön
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar and Time Selection */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Fakülte ve Bölüm Seçimi</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fakülte
                  </label>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                  >
                    <option value="">Seçiniz</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bölüm
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    disabled={!selectedFaculty}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa] disabled:bg-gray-100"
                  >
                    <option value="">Seçiniz</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Akademisyen</h2>
              </div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005baa]"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <select
                    value={selectedLecturer}
                    onChange={(e) => setSelectedLecturer(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                    disabled={!selectedDepartment}
                  >
                    <option value="">Seçiniz</option>
                    {lecturers.map((lecturer) => (
                      <option 
                        key={lecturer.id} 
                        value={lecturer.id}
                        className={lecturer.is_restricted ? 'text-red-600' : ''}
                      >
                        {lecturer.name}
                        {lecturer.is_restricted ? ' (Bu akademisyenden bir hafta içinde randevu alamazsınız)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedLecturer && lecturers.find(l => l.id === selectedLecturer)?.is_restricted && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-sm">
                        Bu akademisyenden {format(parseISO(lecturers.find(l => l.id === selectedLecturer)?.restriction_end_date!), 'd MMMM yyyy', { locale: tr })} tarihine kadar randevu alamazsınız.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Tarih Seçin</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setWeekStartDate(addDays(weekStartDate, -7))}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setWeekStartDate(addDays(weekStartDate, 7))}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date) => {
                  const isSelected = isSameDay(date, selectedDate);
                  const hasAvailability = isDateAvailable(date);

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => hasAvailability && setSelectedDate(date)}
                      disabled={!hasAvailability}
                      className={`
                        p-2 rounded-lg text-center
                        ${isSelected ? 'bg-[#005baa] text-white' : 'hover:bg-gray-100'}
                        ${!hasAvailability && 'opacity-50 cursor-not-allowed'}
                      `}
                    >
                      <div className="text-xs font-medium">
                        {format(date, 'EEE', { locale: tr })}
                      </div>
                      <div className="mt-1 text-sm">
                        {format(date, 'd')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Saat Seçin</h2>
              <div className="grid grid-cols-4 gap-2">
                {availableTimeSlots.map((time) => {
                  const isBooked = existingAppointments.some(appointment => appointment.start_time === time);
                  return (
                    <button
                      key={time}
                      onClick={() => !isBooked && setSelectedTime(time)}
                      disabled={isBooked}
                      className={`
                        p-2 rounded-lg text-center border relative
                        ${selectedTime === time ? 'bg-[#005baa] text-white border-[#005baa]' : 'border-gray-300 hover:bg-gray-100'}
                        ${isBooked && 'opacity-50 cursor-not-allowed'}
                      `}
                    >
                      {time}
                      {isBooked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="absolute inset-0 border-t-2 border-red-500 transform rotate-12"></div>
                          <div className="absolute bg-white px-2 py-1 rounded text-sm text-red-600 font-medium">
                            Dolu
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {availableTimeSlots.length === 0 && (
                <p className="text-center text-gray-500 mt-4">
                  Bu tarih için uygun saat bulunmamaktadır
                </p>
              )}
            </div>
          </div>

          {/* Appointment Details Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Randevu Bilgileri</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-[#005baa] mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Tarih</p>
                    <p className="font-medium">
                      {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: tr }) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-[#005baa] mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Saat</p>
                    <p className="font-medium">{selectedTime || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konu <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                  placeholder="Randevu konusu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mesaj <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                  placeholder="Akademisyene iletmek istediğiniz mesaj"
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedLecturer || !selectedDate || !selectedTime || !subject.trim() || !message.trim() || lecturers.find(l => l.id === selectedLecturer)?.is_restricted}
                className="w-full bg-[#005baa] text-white py-2 px-4 rounded-md hover:bg-[#0070d4] transition-colors disabled:opacity-50"
              >
                {loading ? 'Randevu Oluşturuluyor...' : 'Randevu Oluştur'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}