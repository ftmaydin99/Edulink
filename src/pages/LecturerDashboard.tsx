import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO, addDays, addYears, startOfWeek, isSameDay, addMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Plus, Trash2, Clock } from 'lucide-react';

interface Lecturer {
  name: string;
}

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  student_name: string;
  student_faculty: string;
  student_department: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface Availability {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  time_slots: TimeSlot[];
}

export function LecturerDashboard() {
  const navigate = useNavigate();
  const [lecturer, setLecturer] = useState<Lecturer | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ start: '09:00', end: '17:00' }]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getLecturerData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/ogretim-elemani-giris');
        return;
      }

      const { data: lecturerData } = await supabase
        .from('lecturers')
        .select('name')
        .eq('id', user.id)
        .single();

      if (lecturerData) {
        setLecturer(lecturerData);
      }

      // Yaklaşan randevuları getir
      const tomorrow = addDays(new Date(), 1);
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          start_time,
          end_time,
          subject,
          student_name,
          student_faculty,
          student_department
        `)
        .eq('lecturer_id', user.id)
        .eq('status', 'onaylandı')
        .lte('date', format(tomorrow, 'yyyy-MM-dd'))
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (appointments) {
        setUpcomingAppointments(appointments);
      }

      // Müsaitlikleri getir
      const { data: availabilityData } = await supabase
        .from('availabilities')
        .select('id, date, start_time, end_time, time_slots')
        .eq('lecturer_id', user.id)
        .order('date');

      if (availabilityData) {
        const formattedAvailabilities = availabilityData.map(av => ({
          ...av,
          time_slots: av.time_slots || []
        }));
        setAvailabilities(formattedAvailabilities);
      }
    }

    getLecturerData();
  }, [navigate]);

  const handleDateClick = async (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      setError('Geçmiş tarihlere müsaitlik eklenemez');
      return;
    }
    
    setSelectedDate(date);
    setEndDate(null);
    setIsRecurring(false);
    
    // Check if there are existing availabilities for this date
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingAvailability = availabilities.find(av => av.date === dateStr);
    
    if (existingAvailability) {
      // Use the time_slots from the existing availability record
      if (existingAvailability.time_slots && existingAvailability.time_slots.length > 0) {
        setTimeSlots(existingAvailability.time_slots);
      } else {
        // Fallback to creating a single slot from start_time/end_time
        setTimeSlots([{
          start: existingAvailability.start_time,
          end: existingAvailability.end_time
        }]);
      }
    } else {
      setTimeSlots([{ start: '09:00', end: '17:00' }]);
    }
    
    setShowTimeModal(true);
  };

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: '09:00', end: '17:00' }]);
  };

  const removeTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const newTimeSlots = [...timeSlots];
    newTimeSlots[index][field] = value;
    setTimeSlots(newTimeSlots);
  };

  const validateTimeSlots = () => {
    // Check if all slots have valid times
    for (const slot of timeSlots) {
      if (!slot.start || !slot.end || slot.start >= slot.end) {
        setError('Tüm zaman aralıkları için geçerli başlangıç ve bitiş saatleri giriniz');
        return false;
      }
    }

    // Check for overlaps
    const sortedSlots = [...timeSlots].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      if (sortedSlots[i].end > sortedSlots[i + 1].start) {
        setError('Zaman aralıkları çakışmamalıdır');
        return false;
      }
    }

    return true;
  };

  const generateRecurringDates = (startDate: Date, endDate: Date | null): Date[] => {
    const dates: Date[] = [];
    const oneYear = addYears(startDate, 1);
    const finalEndDate = endDate || oneYear;
    
    let currentDate = startDate;
    while (currentDate <= finalEndDate) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 7);
    }
    
    return dates;
  };

  const calculateOverallTimes = (slots: TimeSlot[]) => {
    const sortedSlots = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    return {
      start_time: sortedSlots[0].start,
      end_time: sortedSlots[sortedSlots.length - 1].end
    };
  };

  const handleAddAvailability = async () => {
    if (!selectedDate || !validateTimeSlots()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { start_time, end_time } = calculateOverallTimes(timeSlots);

      if (isRecurring) {
        const dates = generateRecurringDates(selectedDate, endDate);
        
        for (const date of dates) {
          const dateStr = format(date, 'yyyy-MM-dd');
          
          // Use upsert to handle existing records
          const { error: upsertError } = await supabase
            .from('availabilities')
            .upsert({
              lecturer_id: user.id,
              date: dateStr,
              start_time,
              end_time,
              time_slots: timeSlots
            }, {
              onConflict: 'lecturer_id,date'
            });

          if (upsertError) throw upsertError;
        }
      } else {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Use upsert to handle existing records
        const { error: upsertError } = await supabase
          .from('availabilities')
          .upsert({
            lecturer_id: user.id,
            date: dateStr,
            start_time,
            end_time,
            time_slots: timeSlots
          }, {
            onConflict: 'lecturer_id,date'
          });

        if (upsertError) throw upsertError;
      }

      // Refresh availabilities
      const { data: newAvailabilities } = await supabase
        .from('availabilities')
        .select('id, date, start_time, end_time, time_slots')
        .eq('lecturer_id', user.id)
        .order('date');

      if (newAvailabilities) {
        const formattedAvailabilities = newAvailabilities.map(av => ({
          ...av,
          time_slots: av.time_slots || []
        }));
        setAvailabilities(formattedAvailabilities);
      }

      setShowTimeModal(false);
      setSelectedDate(null);
      setEndDate(null);
      setIsRecurring(false);
      setTimeSlots([{ start: '09:00', end: '17:00' }]);
      setError(null);
    } catch (err) {
      console.error('Error adding availability:', err);
      setError('Müsaitlik eklenirken bir hata oluştu');
    }
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    try {
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', availabilityId);

      if (error) throw error;

      setAvailabilities(availabilities.filter(a => a.id !== availabilityId));
    } catch (err) {
      setError('Müsaitlik silinirken bir hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        userName={lecturer?.name}
        userRole="lecturer"
      />
      
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Hoş Geldiniz, {lecturer?.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Müsaitlik durumunuzu ve yaklaşan randevularınızı buradan yönetebilirsiniz
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Müsaitlik Takvimi */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Takvimim</h2>
                <Calendar
                  locale="tr-TR"
                  className="w-full rounded-lg border-0 shadow-none"
                  tileClassName={({ date }) => {
                    const formattedDate = format(date, 'yyyy-MM-dd');
                    const hasAvailability = availabilities.some(a => a.date === formattedDate);
                    return hasAvailability ? 'bg-green-100 hover:bg-green-200' : '';
                  }}
                  onClickDay={handleDateClick}
                />
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Uygun Saatler</h3>
                <div className="space-y-4">
                  {availabilities.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Henüz müsaitlik eklenmemiş
                    </p>
                  ) : (
                    availabilities.map((availability) => (
                      <div
                        key={availability.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {format(parseISO(availability.date), 'd MMMM yyyy', { locale: tr })}
                          </p>
                          <div className="mt-2 space-y-1">
                            {availability.time_slots && availability.time_slots.length > 0 ? (
                              availability.time_slots.map((slot, index) => (
                                <div key={index} className="flex items-center text-sm text-gray-600">
                                  <Clock className="h-4 w-4 mr-2" />
                                  {slot.start} - {slot.end}
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-2" />
                                {availability.start_time} - {availability.end_time}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAvailability(availability.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Yaklaşan Randevular */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Yaklaşan Randevular</h2>
              <div className="space-y-4">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Bugün veya yarın için onaylanmış randevunuz bulunmamaktadır
                  </p>
                ) : (
                  upcomingAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{appointment.student_name}</h3>
                          <p className="text-sm text-gray-500">{appointment.student_faculty}</p>
                          <p className="text-sm text-gray-500">{appointment.student_department}</p>
                          <p className="mt-2 text-gray-700">{appointment.subject}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {format(parseISO(appointment.date), 'd MMMM yyyy', { locale: tr })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.start_time} - {appointment.end_time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Müsaitlik Ekleme Modalı */}
      {showTimeModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {format(selectedDate, 'd MMMM yyyy', { locale: tr })} için Müsaitlik
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Zaman Aralıkları
                  </label>
                  <button
                    onClick={addTimeSlot}
                    className="flex items-center text-[#005baa] hover:text-[#0070d4] text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ekle
                  </button>
                </div>
                
                <div className="space-y-3">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                      />
                      {timeSlots.length > 1 && (
                        <button
                          onClick={() => removeTimeSlot(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 text-[#005baa] focus:ring-[#005baa] border-gray-300 rounded"
                />
                <label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">
                  Her hafta tekrar et
                </label>
              </div>

              {isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bitiş Tarihi (Opsiyonel)
                  </label>
                  <input
                    type="date"
                    value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                    min={format(addDays(selectedDate, 7), 'yyyy-MM-dd')}
                    max={format(addYears(selectedDate, 1), 'yyyy-MM-dd')}
                    onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Bitiş tarihi girilmezse 1 yıl boyunca tekrar eder
                  </p>
                </div>
              )}

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowTimeModal(false);
                    setSelectedDate(null);
                    setEndDate(null);
                    setIsRecurring(false);
                    setTimeSlots([{ start: '09:00', end: '17:00' }]);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddAvailability}
                  className="px-4 py-2 bg-[#005baa] text-white rounded-md hover:bg-[#0070d4] transition-colors"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}