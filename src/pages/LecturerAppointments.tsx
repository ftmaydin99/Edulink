import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO, addMinutes, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Header } from '../components/Header';
import { 
  User,
  Building2,
  GraduationCap,
  Calendar,
  Clock,
  Clock4,
  BookOpen,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  X,
  ClipboardList,
  Filter,
  Search,
  Plus,
  UserPlus,
  CalendarClock,
  Check,
  MessageCircle,
  UserCheck
} from 'lucide-react';

interface Appointment {
  id: string;
  student_id: string;
  lecturer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  subject: string;
  message?: string;
  student_name: string;
  student_email: string;
  student_faculty: string;
  student_department: string;
  student_year: string;
  status: 'bekliyor' | 'onaylandı' | 'iptal' | 'awaiting_student_approval';
  meeting_status?: 'yapıldı' | 'yapılmadı';
  meeting_note?: string;
  processed_at?: string;
  processed_by?: string;
  is_follow_up?: boolean;
  created_by_faculty?: boolean;
  rescheduled_date?: string;
  rescheduled_start_time?: string;
  rescheduled_end_time?: string;
  reschedule_reason?: string;
  related_to_appointment_id?: string;
}

interface Message {
  content: string;
  sent_at: string;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export function LecturerAppointments() {
  const navigate = useNavigate();
  const [lecturer, setLecturer] = useState<{ name: string } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'bekliyor' | 'onaylandı' | 'iptal' | 'awaiting_student_approval'>('bekliyor');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stats, setStats] = useState({
    bekliyor: 0,
    onaylandı: 0,
    iptal: 0,
    awaiting_student_approval: 0
  });
  const [messages, setMessages] = useState<Record<string, Message>>({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelMessage, setCancelMessage] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Follow-up appointment state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [appointmentDuration, setAppointmentDuration] = useState<number>(30);
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState<string>('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  // Meeting status modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState<'yapıldı' | 'yapılmadı' | null>(null);
  const [meetingNote, setMeetingNote] = useState('');

  useEffect(() => {
    fetchLecturerData();
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'iptal' && appointments.length > 0) {
      fetchMessages();
    }
  }, [activeTab, appointments]);

  // Süre değiştiğinde bitiş saatini otomatik güncelle
  useEffect(() => {
    if (selectedStartTime && appointmentDuration) {
      const startTime = parseISO(`2000-01-01T${selectedStartTime}`);
      const endTime = addMinutes(startTime, appointmentDuration);
      setSelectedEndTime(format(endTime, 'HH:mm'));
    }
  }, [selectedStartTime, appointmentDuration]);

  // Reschedule süre değiştiğinde bitiş saatini otomatik güncelle
  useEffect(() => {
    if (rescheduleStartTime) {
      const startTime = parseISO(`2000-01-01T${rescheduleStartTime}`);
      const endTime = addMinutes(startTime, 30); // Varsayılan 30 dakika
      setRescheduleEndTime(format(endTime, 'HH:mm'));
    }
  }, [rescheduleStartTime]);

  // Refetch appointments when date filter changes
  useEffect(() => {
    if (!loading) {
      fetchAppointments();
    }
  }, [dateFilter, customDate]);

  const fetchLecturerData = async () => {
    try {
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
    } catch (err) {
      console.error('Error fetching lecturer data:', err);
    }
  };

  const getDateRange = (filter: DateFilter, customDate?: string) => {
    const now = new Date();
    
    switch (filter) {
      case 'today':
        return {
          start: format(startOfDay(now), 'yyyy-MM-dd'),
          end: format(endOfDay(now), 'yyyy-MM-dd')
        };
      case 'week':
        return {
          start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        };
      case 'month':
        return {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd')
        };
      case 'custom':
        if (customDate) {
          return {
            start: customDate,
            end: customDate
          };
        }
        return null;
      default:
        return null;
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const appointmentIds = appointments.map(a => a.id);

      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('content, sent_at, appointment_id')
        .eq('to_lecturer_id', user.id)
        .in('appointment_id', appointmentIds)
        .order('sent_at', { ascending: false });

      if (messageError) throw messageError;

      const messageMap: Record<string, Message> = {};
      messageData?.forEach(msg => {
        if (msg.appointment_id) {
          messageMap[msg.appointment_id] = {
            content: msg.content,
            sent_at: msg.sent_at
          };
        }
      });

      setMessages(messageMap);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleRescheduleClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
    setRescheduleDate('');
    setRescheduleStartTime('');
    setRescheduleEndTime('');
    setRescheduleReason('');
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleReason.trim()) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setRescheduling(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      // Randevuyu ertele - status'u 'awaiting_student_approval' yap
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'awaiting_student_approval',
          rescheduled_date: rescheduleDate,
          rescheduled_start_time: rescheduleStartTime,
          rescheduled_end_time: rescheduleEndTime,
          reschedule_reason: rescheduleReason,
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      // Öğrenciye mesaj gönder
      const messageContent = `Akademisyen randevunuzu ertelemek istiyor:\n\nEski Tarih: ${format(parseISO(selectedAppointment.date), 'd MMMM yyyy', { locale: tr })}\nEski Saat: ${selectedAppointment.start_time} - ${selectedAppointment.end_time}\n\nYeni Tarih: ${format(parseISO(rescheduleDate), 'd MMMM yyyy', { locale: tr })}\nYeni Saat: ${rescheduleStartTime} - ${rescheduleEndTime}\n\nNeden: ${rescheduleReason}\n\nLütfen randevularım sayfasından onaylayın veya reddedin.`;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          from_lecturer_id: user.id,
          to_student_id: selectedAppointment.student_id,
          content: messageContent,
          appointment_id: selectedAppointment.id
        });

      if (messageError) throw messageError;

      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      await Promise.all([fetchAppointments(), fetchStats()]);
      
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
      setError(err.message || 'Randevu ertelenirken bir hata oluştu');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedAppointment || !cancelMessage.trim()) {
      setError('Lütfen iptal nedenini belirtiniz');
      return;
    }

    try {
      setUpdating(selectedAppointment.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'iptal',
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      const messageContent = `Randevunuz akademisyen tarafından iptal edilmiştir.\nTarih: ${format(parseISO(selectedAppointment.date), 'd MMMM yyyy', { locale: tr })}\nSaat: ${selectedAppointment.start_time}\nİptal Nedeni: ${cancelMessage}`;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          from_lecturer_id: user.id,
          to_student_id: selectedAppointment.student_id,
          content: messageContent,
          appointment_id: selectedAppointment.id
        });

      if (messageError) throw messageError;

      await Promise.all([fetchAppointments(), fetchStats()]);
      setShowCancelModal(false);
      setCancelMessage('');
      setSelectedAppointment(null);
    } catch (err) {
      console.error('Randevu iptal edilirken hata:', err);
      setError(err.message || 'Randevu iptal edilirken bir hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  const handleMeetingStatus = async () => {
    if (!selectedAppointment || !meetingStatus) {
      setError('Lütfen toplantı durumunu seçin');
      return;
    }

    try {
      setUpdating(selectedAppointment.id);

      const updates = {
        meeting_status: meetingStatus,
        meeting_note: meetingNote || null
      };

      const { error: updateError } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      if (meetingStatus === 'yapılmadı') {
        const restrictionEndDate = new Date();
        restrictionEndDate.setDate(restrictionEndDate.getDate() + 7);

        const { error: restrictionError } = await supabase
          .from('appointment_restrictions')
          .insert({
            student_id: selectedAppointment.student_id,
            lecturer_id: selectedAppointment.lecturer_id,
            end_date: format(restrictionEndDate, 'yyyy-MM-dd')
          });

        if (restrictionError) throw restrictionError;
      }

      await fetchAppointments();
      
      setShowMeetingModal(false);
      setMeetingStatus(null);
      setMeetingNote('');
      setSelectedAppointment(null);
    } catch (err) {
      console.error('Error updating meeting status:', err);
      setError(err.message || 'Toplantı durumu güncellenirken bir hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  const handleFollowUpClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowFollowUpModal(true);
    setSelectedDate('');
    setSelectedStartTime('');
    setSelectedEndTime('');
    setAppointmentDuration(30);
  };

  const handleCreateFollowUp = async () => {
    if (!selectedAppointment || !selectedDate || !selectedStartTime || !selectedEndTime) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setCreatingFollowUp(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      // Yeni takip toplantısı oluştur
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert([{
          student_id: selectedAppointment.student_id,
          lecturer_id: selectedAppointment.lecturer_id,
          date: selectedDate,
          start_time: selectedStartTime,
          end_time: selectedEndTime,
          status: 'onaylandı',
          subject: 'Takip Toplantısı', // Etiket: Takip Toplantısı
          message: 'Akademisyen tarafından yeni bir toplantı oluşturulmuştur', // Mesaj güncellendi
          student_name: selectedAppointment.student_name,
          student_email: selectedAppointment.student_email,
          student_faculty: selectedAppointment.student_faculty,
          student_department: selectedAppointment.student_department,
          student_year: selectedAppointment.student_year,
          is_follow_up: true,
          created_by_faculty: true,
          related_to_appointment_id: null, // Yeni randevu için null
          processed_at: new Date().toISOString(),
          processed_by: user.id
        }]);

      if (appointmentError) throw appointmentError;

      // Öğrenciye mesaj gönder
      const messageContent = `Hocanız sizin için yeni bir takip toplantısı oluşturdu:\nTarih: ${format(parseISO(selectedDate), 'd MMMM yyyy', { locale: tr })}\nSaat: ${selectedStartTime} - ${selectedEndTime}\nSüre: ${appointmentDuration} dakika`;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          from_lecturer_id: user.id,
          to_student_id: selectedAppointment.student_id,
          content: messageContent
        });

      if (messageError) throw messageError;

      setShowFollowUpModal(false);
      setSelectedAppointment(null);
      setSelectedDate('');
      setSelectedStartTime('');
      setSelectedEndTime('');
      setAppointmentDuration(30);
      
      await fetchAppointments();
      
      alert('Takip toplantısı başarıyla oluşturuldu!');
    } catch (err) {
      console.error('Error creating follow-up appointment:', err);
      setError(err.message || 'Takip toplantısı oluşturulurken bir hata oluştu');
    } finally {
      setCreatingFollowUp(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { data: appointments, error: statsError } = await supabase
        .from('appointments')
        .select('status')
        .eq('lecturer_id', user.id);

      if (statsError) throw statsError;

      const counts = appointments?.reduce((acc, appointment) => {
        acc[appointment.status] = (acc[appointment.status] || 0) + 1;
        return acc;
      }, { bekliyor: 0, onaylandı: 0, iptal: 0, awaiting_student_approval: 0 });

      setStats(counts);
    } catch (err) {
      console.error('İstatistikler alınırken hata:', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      let query = supabase
        .from('appointments')
        .select('*')
        .eq('lecturer_id', user.id)
        .eq('status', activeTab);

      // Add date filter if selected
      const dateRange = getDateRange(dateFilter, customDate);
      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end);
      }

      const { data, error } = await query
        .order('date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      setError('Randevular yüklenirken bir hata oluştu');
      console.error('Randevular alınırken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentStatus = async (appointmentId: string, newStatus: 'onaylandı' | 'iptal') => {
    try {
      setUpdating(appointmentId);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) throw new Error('Randevu bulunamadı');

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      const messageContent = newStatus === 'onaylandı'
        ? `Randevunuz onaylanmıştır. Tarih: ${format(parseISO(appointment.date), 'd MMMM yyyy', { locale: tr })}, Saat: ${appointment.start_time}`
        : `Randevunuz iptal edilmiştir. Tarih: ${format(parseISO(appointment.date), 'd MMMM yyyy', { locale: tr })}, Saat: ${appointment.start_time}`;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          from_lecturer_id: user.id,
          to_student_id: appointment.student_id,
          content: messageContent,
          appointment_id: appointmentId
        });

      if (messageError) throw messageError;

      await Promise.all([fetchAppointments(), fetchStats()]);
    } catch (err) {
      console.error('Randevu durumu güncellenirken hata:', err);
      setError(err.message || 'Randevu durumu güncellenirken bir hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      appointment.student_name?.toLowerCase().includes(searchTermLower) ||
      appointment.subject?.toLowerCase().includes(searchTermLower) ||
      appointment.student_faculty?.toLowerCase().includes(searchTermLower) ||
      appointment.student_department?.toLowerCase().includes(searchTermLower)
    );
  });

  // Helper function to determine appointment type and created by info
  const getAppointmentTypeAndCreatedBy = (appointment: Appointment) => {
    let appointmentType = null;
    let createdByText = null;

    // Eğer "Takip Toplantısı" ise
    if (appointment.subject === 'Takip Toplantısı' && appointment.is_follow_up && appointment.created_by_faculty) {
      appointmentType = 'Takip Toplantısı';
      createdByText = 'Siz Tarafından Oluşturuldu';
    }
    // Eğer "Ertelenen Toplantı" ise
    else if (appointment.subject === 'Ertelenen Toplantı') {
      appointmentType = 'Ertelenen Toplantı';
      createdByText = 'Siz Tarafından Oluşturuldu';
    }

    return { appointmentType, createdByText };
  };

  // Safe date formatting function
  const safeFormatDate = (dateString: string | null | undefined, formatStr: string = 'd MMMM yyyy') => {
    if (!dateString) return 'Tarih belirtilmemiş';
    
    try {
      const parsedDate = parseISO(dateString);
      if (!isValid(parsedDate)) return 'Geçersiz tarih';
      return format(parsedDate, formatStr, { locale: tr });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Tarih formatı hatası';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005baa]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        userName={lecturer?.name}
        userRole="lecturer"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Randevu Talepleri</h1>
          <p className="mt-1 text-sm text-gray-500">
            Öğrencilerden gelen randevu taleplerini görüntüleyin ve yönetin
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setActiveTab('bekliyor')}
            className={`flex items-center justify-center p-4 rounded-lg ${
              activeTab === 'bekliyor'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } transition-colors`}
          >
            <Clock4 className="h-5 w-5 mr-2" />
            <span className="font-medium">Bekleyen ({stats.bekliyor})</span>
          </button>
          <button
            onClick={() => setActiveTab('onaylandı')}
            className={`flex items-center justify-center p-4 rounded-lg ${
              activeTab === 'onaylandı'
                ? 'bg-green-100 text-green-800'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } transition-colors`}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <span className="font-medium">Onaylanan ({stats.onaylandı})</span>
          </button>
          <button
            onClick={() => setActiveTab('awaiting_student_approval')}
            className={`flex items-center justify-center p-4 rounded-lg ${
              activeTab === 'awaiting_student_approval'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } transition-colors`}
          >
            <CalendarClock className="h-5 w-5 mr-2" />
            <span className="font-medium">Öğrenci Onayı Bekleyen ({stats.awaiting_student_approval})</span>
          </button>
          <button
            onClick={() => setActiveTab('iptal')}
            className={`flex items-center justify-center p-4 rounded-lg ${
              activeTab === 'iptal'
                ? 'bg-red-100 text-red-800'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } transition-colors`}
          >
            <XCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">İptal Edilen ({stats.iptal})</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Öğrenci adı, konu veya bölüm ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#005baa] focus:border-[#005baa]"
                />
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            {/* Date Filter - Only show for approved appointments */}
            {activeTab === 'onaylandı' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setDateFilter('all');
                    setCustomDate('');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === 'all'
                      ? 'bg-[#005baa] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tüm Tarihler
                </button>
                
                <button
                  onClick={() => {
                    setDateFilter('today');
                    setCustomDate('');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === 'today'
                      ? 'bg-[#005baa] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bugün
                </button>
                
                <button
                  onClick={() => {
                    setDateFilter('week');
                    setCustomDate('');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === 'week'
                      ? 'bg-[#005baa] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bu Hafta
                </button>
                
                <button
                  onClick={() => {
                    setDateFilter('month');
                    setCustomDate('');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === 'month'
                      ? 'bg-[#005baa] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bu Ay
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`p-2 rounded-lg transition-colors ${
                      dateFilter === 'custom' && customDate
                        ? 'bg-[#005baa] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Tarih seç"
                  >
                    <Calendar className="h-5 w-5" />
                  </button>
                  
                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => {
                          setCustomDate(e.target.value);
                          setDateFilter('custom');
                          setShowDatePicker(false);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#005baa] focus:border-[#005baa] text-sm"
                      />
                    </div>
                  )}
                </div>
                
                {(dateFilter !== 'all' || customDate) && (
                  <button
                    onClick={() => {
                      setDateFilter('all');
                      setCustomDate('');
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                  >
                    Temizle
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || (dateFilter !== 'all' || customDate)
                  ? 'Arama kriterlerine uygun randevu bulunamadı'
                  : `${activeTab === 'bekliyor' ? 'Bekleyen' : activeTab === 'onaylandı' ? 'Onaylanan' : activeTab === 'awaiting_student_approval' ? 'Öğrenci onayı bekleyen' : 'İptal edilen'} randevu bulunmamaktadır`}
              </div>
            ) : (
              filteredAppointments.map((appointment) => {
                const { appointmentType, createdByText } = getAppointmentTypeAndCreatedBy(appointment);
                
                return (
                  <div key={appointment.id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#005baa]/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-[#005baa]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-medium text-gray-900">{appointment.student_name}</h3>
                            {appointmentType && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <UserCheck className="h-3 w-3 mr-1" />
                                {appointmentType}
                              </span>
                            )}
                            {createdByText && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {createdByText}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{appointment.student_email}</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-sm text-gray-500">
                              <Building2 className="h-4 w-4 mr-1" />
                              {appointment.student_faculty || 'Fakülte bilgisi yok'}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <BookOpen className="h-4 w-4 mr-1" />
                              {appointment.student_department || 'Bölüm bilgisi yok'}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <GraduationCap className="h-4 w-4 mr-1" />
                              {appointment.student_year || 'Sınıf bilgisi yok'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {safeFormatDate(appointment.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {appointment.start_time} - {appointment.end_time}
                          </span>
                        </div>
                        {activeTab === 'bekliyor' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAppointmentStatus(appointment.id, 'onaylandı')}
                              disabled={updating === appointment.id}
                              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-5 w-5 mr-1" />
                              {updating === appointment.id ? 'İşleniyor...' : 'Onayla'}
                            </button>
                            <button
                              onClick={() => handleCancelClick(appointment)}
                              disabled={updating === appointment.id}
                              className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="h-5 w-5 mr-1" />
                              {updating === appointment.id ? 'İşleniyor...' : 'İptal Et'}
                            </button>
                          </div>
                        )}
                        {activeTab === 'onaylandı' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRescheduleClick(appointment)}
                              className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                            >
                              <CalendarClock className="h-5 w-5 mr-1" />
                              Randevuyu Ertele
                            </button>
                          </div>
                        )}
                        {activeTab === 'awaiting_student_approval' && appointment.rescheduled_date && (
                          <div className="text-right">
                            <p className="text-sm text-blue-600 font-medium">Öğrenci onayı bekleniyor</p>
                            <p className="text-xs text-gray-500">
                              Yeni tarih: {safeFormatDate(appointment.rescheduled_date)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Yeni saat: {appointment.rescheduled_start_time} - {appointment.rescheduled_end_time}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {appointment.subject && (
                      <div className="mt-4 p-4 bg-white rounded-lg">
                        <p className="font-medium text-gray-900">Konu</p>
                        <p className="mt-1 text-gray-600">{appointment.subject}</p>
                      </div>
                    )}
                    {appointment.message && (
                      <div className="mt-4 p-4 bg-white rounded-lg">
                        <p className="font-medium text-gray-900">Mesaj</p>
                        <p className="mt-1 text-gray-600">{appointment.message}</p>
                      </div>
                    )}
                    {activeTab === 'awaiting_student_approval' && appointment.reschedule_reason && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-900">Erteleme Nedeni</p>
                        <p className="mt-1 text-blue-700">{appointment.reschedule_reason}</p>
                      </div>
                    )}
                    {activeTab === 'iptal' && messages[appointment.id] && (
                      <div className="mt-4 p-4 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="h-5 w-5 text-red-600" />
                          <p className="font-medium text-red-900">İptal Nedeni</p>
                        </div>
                        <p className="text-red-700">
                          {messages[appointment.id].content.split('İptal Nedeni:')[1]?.trim() || 'İptal nedeni belirtilmemiş'}
                        </p>
                      </div>
                    )}
                    {activeTab === 'onaylandı' && !appointment.meeting_status && (
                      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock4 className="h-5 w-5 text-yellow-600" />
                            <p className="font-medium text-yellow-900">Toplantı Durumu</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowMeetingModal(true);
                            }}
                            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
                          >
                            Durumu Güncelle
                          </button>
                        </div>
                      </div>
                    )}
                    {activeTab === 'onaylandı' && appointment.meeting_status && (
                      <div className={`mt-4 p-4 ${
                        appointment.meeting_status === 'yapıldı' 
                          ? 'bg-green-50' 
                          : 'bg-red-50'
                      } rounded-lg`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {appointment.meeting_status === 'yapıldı' ? (
                                <Check className="h-5 w-5 text-green-600" />
                              ) : (
                                <X className="h-5 w-5 text-red-600" />
                              )}
                              <p className={`font-medium ${
                                appointment.meeting_status === 'yapıldı'
                                  ? 'text-green-900'
                                  : 'text-red-900'
                              }`}>
                                Toplantı {appointment.meeting_status === 'yapıldı' ? 'yapıldı' : 'yapılmadı'}
                              </p>
                            </div>
                            {appointment.meeting_note && (
                              <p className={`mt-2 ${
                                appointment.meeting_status === 'yapıldı'
                                  ? 'text-green-700'
                                  : 'text-red-700'
                              }`}>
                                {appointment.meeting_note}
                              </p>
                            )}
                          </div>
                          {appointment.meeting_status === 'yapıldı' && (
                            <button
                              onClick={() => handleFollowUpClick(appointment)}
                              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Yeni Randevu Ver
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Randevuyu Ertele</h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Mevcut Randevu:</p>
                <p className="font-medium">{safeFormatDate(selectedAppointment.date)}</p>
                <p className="text-sm text-gray-600">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Tarih
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Başlangıç Saati
                </label>
                <select
                  value={rescheduleStartTime}
                  onChange={(e) => setRescheduleStartTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                >
                  <option value="">Saat seçin</option>
                  {generateTimeSlots().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              {rescheduleStartTime && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yeni Bitiş Saati
                  </label>
                  <input
                    type="time"
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Erteleme Nedeni
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-[#005baa] focus:border-[#005baa]"
                  placeholder="Randevuyu neden ertelediğinizi açıklayın..."
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setSelectedAppointment(null);
                    setRescheduleDate('');
                    setRescheduleStartTime('');
                    setRescheduleEndTime('');
                    setRescheduleReason('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={handleRescheduleSubmit}
                  disabled={!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime || !rescheduleReason.trim() || rescheduling}
                  className="px-4 py-2 bg-[#005baa] text-white rounded-md hover:bg-[#0070d4] transition-colors disabled:opacity-50"
                >
                  {rescheduling ? 'Erteleniyor...' : 'Ertele'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Status Modal */}
      {showMeetingModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Toplantı Durumu</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="yapıldı"
                    checked={meetingStatus === 'yapıldı'}
                    onChange={(e) => setMeetingStatus(e.target.value as 'yapıldı')}
                    className="text-[#005baa] focus:ring-[#005baa]"
                  />
                  <span>Toplantı yapıldı</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="yapılmadı"
                    checked={meetingStatus === 'yapılmadı'}
                    onChange={(e) => setMeetingStatus(e.target.value as 'yapılmadı')}
                    className="text-[#005baa] focus:ring-[#005baa]"
                  />
                  <span>Toplantı yapılmadı</span>
                </label>
              </div>

              {meetingStatus && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Not (İsteğe bağlı)
                  </label>
                  <textarea
                    value={meetingNote}
                    onChange={(e) => setMeetingNote(e.target.value)}
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-md resize-none"
                    placeholder="Toplantı hakkında not ekleyin..."
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowMeetingModal(false);
                    setMeetingStatus(null);
                    setMeetingNote('');
                    setSelectedAppointment(null);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={handleMeetingStatus}
                  disabled={!meetingStatus || updating === selectedAppointment.id}
                  className="px-4 py-2 bg-[#005baa] text-white rounded-md hover:bg-[#0070d4] transition-colors disabled:opacity-50"
                >
                  {updating === selectedAppointment.id ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Appointment Modal */}
      {showFollowUpModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {selectedAppointment.student_name} için Takip Toplantısı
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarih
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedStartTime('');
                    setSelectedEndTime('');
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                />
              </div>

              {selectedDate && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Başlangıç Saati
                    </label>
                    <select
                      value={selectedStartTime}
                      onChange={(e) => setSelectedStartTime(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                    >
                      <option value="">Saat seçin</option>
                      {generateTimeSlots().map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStartTime && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Randevu Süresi (dakika)
                        </label>
                        <select
                          value={appointmentDuration}
                          onChange={(e) => setAppointmentDuration(Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa]"
                        >
                          <option value={15}>15 dakika</option>
                          <option value={30}>30 dakika</option>
                          <option value={45}>45 dakika</option>
                          <option value={60}>60 dakika</option>
                          <option value={90}>90 dakika</option>
                          <option value={120}>120 dakika</option>
                        </select>
                      </div>

                      {selectedEndTime && (
                        <div className="p-3 bg-blue-50 rounded-md">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Randevu Özeti</span>
                          </div>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>Tarih: {safeFormatDate(selectedDate)}</p>
                            <p>Saat: {selectedStartTime} - {selectedEndTime}</p>
                            <p>Süre: {appointmentDuration} dakika</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowFollowUpModal(false);
                    setSelectedAppointment(null);
                    setSelectedDate('');
                    setSelectedStartTime('');
                    setSelectedEndTime('');
                    setAppointmentDuration(30);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateFollowUp}
                  disabled={!selectedDate || !selectedStartTime || !selectedEndTime || creatingFollowUp}
                  className="px-4 py-2 bg-[#005baa] text-white rounded-md hover:bg-[#0070d4] transition-colors disabled:opacity-50"
                >
                  {creatingFollowUp ? 'Oluşturuluyor...' : 'Randevu Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Randevu İptal Nedeni</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İptal nedenini belirtiniz
                </label>
                <textarea
                  value={cancelMessage}
                  onChange={(e) => setCancelMessage(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md resize-none"
                  placeholder="İptal nedenini yazınız..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelMessage('');
                    setSelectedAppointment(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={!cancelMessage.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  İptal Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}