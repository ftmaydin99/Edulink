import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
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
  UserCheck,
  CalendarClock,
  Check,
  X
} from 'lucide-react';

interface BaseAppointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  message?: string;
  is_follow_up?: boolean;
  created_by_faculty?: boolean;
  rescheduled_date?: string;
  rescheduled_start_time?: string;
  rescheduled_end_time?: string;
  reschedule_reason?: string;
  related_to_appointment_id?: string;
  lecturer: {
    id: string;
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

interface PendingAppointment extends BaseAppointment {
  status: 'bekliyor';
}

interface ApprovedAppointment extends BaseAppointment {
  status: 'onaylandı';
  processed_at: string;
  processed_by: string;
}

interface CancelledAppointment extends BaseAppointment {
  status: 'iptal';
  processed_at: string;
  processed_by: string;
  cancel_reason?: string;
}

interface AwaitingApprovalAppointment extends BaseAppointment {
  status: 'awaiting_student_approval';
  processed_at: string;
  processed_by: string;
}

type Appointment = PendingAppointment | ApprovedAppointment | CancelledAppointment | AwaitingApprovalAppointment;

interface Message {
  content: string;
  sent_at: string;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
type AppointmentTypeFilter = 'all' | 'normal' | 'follow_up' | 'rescheduled';

export function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bekliyor' | 'onaylandı' | 'iptal' | 'awaiting_student_approval'>('bekliyor');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState<AppointmentTypeFilter>('all');
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
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [student, setStudent] = useState<{ name: string } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
    fetchAppointments();
    fetchStats();
    markAppointmentsAsViewed();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'iptal' && appointments.length > 0) {
      fetchMessages();
    }
  }, [activeTab, appointments]);

  const fetchStudentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('name')
        .eq('id', user.id)
        .single();

      if (studentData) {
        setStudent(studentData);
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
    }
  };

  const markAppointmentsAsViewed = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark all appointments as viewed when student visits this page
      await supabase
        .from('appointments')
        .update({ viewed_by_student: true })
        .eq('student_id', user.id)
        .eq('viewed_by_student', false);

    } catch (err) {
      console.error('Error marking appointments as viewed:', err);
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
        .eq('to_student_id', user.id)
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

  const fetchStats = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Oturum bulunamadı');

      const { data: appointments, error: statsError } = await supabase
        .from('appointments')
        .select('status')
        .eq('student_id', user.id);

      if (statsError) throw statsError;

      const counts = appointments?.reduce((acc, appointment) => {
        acc[appointment.status] = (acc[appointment.status] || 0) + 1;
        return acc;
      }, { bekliyor: 0, onaylandı: 0, iptal: 0, awaiting_student_approval: 0 });

      setStats(counts);
    } catch (err) {
      setError('İstatistikler alınırken bir hata oluştu');
      console.error('Error fetching stats:', err);
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

  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      let query = supabase
        .from('appointments')
        .select(`
          *,
          lecturer:lecturers!appointments_lecturer_id_fkey (
            id,
            name,
            avatar_url,
            faculties (name),
            departments (name)
          )
        `)
        .eq('student_id', user.id)
        .eq('status', activeTab);

      // Add date filter if selected
      const dateRange = getDateRange(dateFilter, customDate);
      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      setError('Randevular yüklenirken bir hata oluştu');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refetch appointments when date filter changes
  useEffect(() => {
    if (!loading) {
      fetchAppointments();
    }
  }, [dateFilter, customDate]);

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedAppointment || !cancelReason.trim()) {
      setError('Lütfen iptal nedenini belirtiniz');
      return;
    }

    try {
      setCancelling(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'iptal',
          processed_at: new Date().toISOString(),
          processed_by: null
        })
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      const messageContent = `Randevunuz öğrenci tarafından iptal edilmiştir.\nTarih: ${format(parseISO(selectedAppointment.date), 'd MMMM yyyy', { locale: tr })}\nSaat: ${selectedAppointment.start_time}\nİptal Nedeni: ${cancelReason}`;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          from_student_id: user.id,
          to_lecturer_id: selectedAppointment.lecturer.id,
          content: messageContent,
          appointment_id: selectedAppointment.id
        });

      if (messageError) throw messageError;

      await Promise.all([fetchAppointments(), fetchStats()]);
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedAppointment(null);
    } catch (err) {
      console.error('Randevu iptal edilirken hata:', err);
      setError(err.message || 'Randevu iptal edilirken bir hata oluştu');
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleResponse = async (appointmentId: string, approve: boolean) => {
    try {
      setUpdating(appointmentId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const appointment = appointments.find(a => a.id === appointmentId) as AwaitingApprovalAppointment;
      if (!appointment) throw new Error('Randevu bulunamadı');

      if (approve) {
        // Onaylandı - randevuyu güncelle
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            status: 'onaylandı',
            date: appointment.rescheduled_date,
            start_time: appointment.rescheduled_start_time,
            end_time: appointment.rescheduled_end_time,
            rescheduled_date: null,
            rescheduled_start_time: null,
            rescheduled_end_time: null,
            reschedule_reason: null,
            processed_at: new Date().toISOString(),
            processed_by: appointment.processed_by,
            subject: 'Ertelenen Toplantı', // Etiket: Ertelenen Toplantı
            message: 'Toplantı akademisyen tarafından ertelenmiştir' // Mesaj güncellendi
          })
          .eq('id', appointmentId);

        if (updateError) throw updateError;

        // Akademisyene onay mesajı gönder
        const messageContent = `Öğrenci randevu erteleme talebinizi onayladı.\nYeni Tarih: ${format(parseISO(appointment.rescheduled_date!), 'd MMMM yyyy', { locale: tr })}\nYeni Saat: ${appointment.rescheduled_start_time} - ${appointment.rescheduled_end_time}`;

        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            from_student_id: user.id,
            to_lecturer_id: appointment.lecturer.id,
            content: messageContent,
            appointment_id: appointmentId
          });

        if (messageError) throw messageError;
      } else {
        // Reddedildi - randevuyu iptal et
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            status: 'iptal',
            processed_at: new Date().toISOString(),
            processed_by: null
          })
          .eq('id', appointmentId);

        if (updateError) throw updateError;

        // Akademisyene red mesajı gönder
        const messageContent = `Öğrenci randevu erteleme talebinizi reddetti. Randevu iptal edilmiştir.\nTarih: ${format(parseISO(appointment.date), 'd MMMM yyyy', { locale: tr })}\nSaat: ${appointment.start_time} - ${appointment.end_time}`;

        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            from_student_id: user.id,
            to_lecturer_id: appointment.lecturer.id,
            content: messageContent,
            appointment_id: appointmentId
          });

        if (messageError) throw messageError;
      }

      await Promise.all([fetchAppointments(), fetchStats()]);
    } catch (err) {
      console.error('Randevu yanıtlanırken hata:', err);
      setError(err.message || 'İşlem sırasında bir hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  // Helper function to get appointment type
  const getAppointmentType = (appointment: Appointment) => {
    if (appointment.subject === 'Takip Toplantısı' && appointment.is_follow_up && appointment.created_by_faculty) {
      return 'follow_up';
    } else if (appointment.subject === 'Ertelenen Toplantı') {
      return 'rescheduled';
    } else {
      return 'normal';
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = (
      appointment.lecturer.name.toLowerCase().includes(searchTermLower) ||
      appointment.subject?.toLowerCase().includes(searchTermLower) ||
      appointment.lecturer.faculties?.name?.toLowerCase().includes(searchTermLower) ||
      appointment.lecturer.departments?.name?.toLowerCase().includes(searchTermLower)
    );

    const appointmentType = getAppointmentType(appointment);
    const matchesType = appointmentTypeFilter === 'all' || appointmentType === appointmentTypeFilter;

    return matchesSearch && matchesType;
  });

  // Helper function to determine appointment type and created by info
  const getAppointmentTypeAndCreatedBy = (appointment: Appointment) => {
    let appointmentType = null;
    let createdByText = null;

    // Eğer "Takip Toplantısı" ise
    if (appointment.subject === 'Takip Toplantısı' && appointment.is_follow_up && appointment.created_by_faculty) {
      appointmentType = 'Takip Toplantısı';
      createdByText = 'Akademisyen Tarafından Oluşturuldu';
    }
    // Eğer "Ertelenen Toplantı" ise
    else if (appointment.subject === 'Ertelenen Toplantı') {
      appointmentType = 'Ertelenen Toplantı';
      createdByText = 'Akademisyen Tarafından Oluşturuldu';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005baa]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        userName={student?.name}
        userRole="student"
      />
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Randevularım</h1>
            <p className="mt-1 text-sm text-gray-500">
              Tüm randevularınızı görüntüleyin ve yönetin
            </p>
          </div>
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
            onClick={() => setActiveTab('awaiting_student_approval')}
            className={`flex items-center justify-center p-4 rounded-lg ${
              activeTab === 'awaiting_student_approval'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } transition-colors`}
          >
            <CalendarClock className="h-5 w-5 mr-2" />
            <span className="font-medium">Erteleme Onayı ({stats.awaiting_student_approval})</span>
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
                  placeholder="Akademisyen, konu veya bölüm ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#005baa] focus:border-[#005baa]"
                />
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Appointment Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Randevu Türü:</span>
                <select
                  value={appointmentTypeFilter}
                  onChange={(e) => setAppointmentTypeFilter(e.target.value as AppointmentTypeFilter)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#005baa] focus:border-[#005baa] text-sm"
                >
                  <option value="all">Tüm Türler</option>
                  <option value="normal">Normal Randevu</option>
                  <option value="follow_up">Takip Toplantısı</option>
                  <option value="rescheduled">Ertelenen Toplantı</option>
                </select>
              </div>

              {/* Date Filter - Only show for approved appointments */}
              {activeTab === 'onaylandı' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Tarih:</span>
                    <div className="flex gap-2">
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
                    </div>
                  </div>

                  {(dateFilter !== 'all' || customDate || appointmentTypeFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setDateFilter('all');
                        setCustomDate('');
                        setShowDatePicker(false);
                        setAppointmentTypeFilter('all');
                      }}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </>
              )}

              {/* Clear filters button for other tabs */}
              {activeTab !== 'onaylandı' && appointmentTypeFilter !== 'all' && (
                <button
                  onClick={() => setAppointmentTypeFilter('all')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || (dateFilter !== 'all' || customDate) || appointmentTypeFilter !== 'all'
                  ? 'Arama kriterlerine uygun randevu bulunamadı'
                  : `${activeTab === 'bekliyor' ? 'Bekleyen' : activeTab === 'onaylandı' ? 'Onaylanan' : activeTab === 'awaiting_student_approval' ? 'Erteleme onayı bekleyen' : 'İptal edilen'} randevu bulunmamaktadır`}
              </div>
            ) : (
              filteredAppointments.map((appointment) => {
                const { appointmentType, createdByText } = getAppointmentTypeAndCreatedBy(appointment);
                
                return (
                  <div 
                    key={appointment.id} 
                    className={`bg-gray-50 rounded-lg p-6 relative ${
                      activeTab === 'awaiting_student_approval' ? 'border-2 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#005baa]/10 flex items-center justify-center overflow-hidden">
                          {appointment.lecturer.avatar_url ? (
                            <img
                              src={appointment.lecturer.avatar_url}
                              alt={appointment.lecturer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-[#005baa]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-medium text-gray-900">{appointment.lecturer.name}</h3>
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
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-sm text-gray-500">
                              <Building2 className="h-4 w-4 mr-1" />
                              {appointment.lecturer.faculties?.name || 'Fakülte bilgisi yok'}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <BookOpen className="h-4 w-4 mr-1" />
                              {appointment.lecturer.departments?.name || 'Bölüm bilgisi yok'}
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
                        {(activeTab === 'bekliyor' || activeTab === 'onaylandı') && !appointment.created_by_faculty && (
                          <button
                            onClick={() => handleCancelClick(appointment)}
                            className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                          >
                            <XCircle className="h-5 w-5 mr-1" />
                            İptal Et
                          </button>
                        )}
                      </div>
                    </div>

                    {activeTab === 'awaiting_student_approval' && appointment.status === 'awaiting_student_approval' && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <CalendarClock className="h-5 w-5 text-blue-600" />
                          <p className="font-medium text-blue-900">Randevu Erteleme Talebi</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-blue-800">Mevcut Randevu:</p>
                            <p className="text-sm text-blue-700">
                              {safeFormatDate(appointment.date)} - {appointment.start_time}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-800">Yeni Randevu:</p>
                            <p className="text-sm text-blue-700">
                              {appointment.rescheduled_date && safeFormatDate(appointment.rescheduled_date)} - {appointment.rescheduled_start_time}
                            </p>
                          </div>
                        </div>

                        {appointment.reschedule_reason && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-blue-800">Erteleme Nedeni:</p>
                            <p className="text-sm text-blue-700">{appointment.reschedule_reason}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRescheduleResponse(appointment.id, true)}
                            disabled={updating === appointment.id}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {updating === appointment.id ? 'İşleniyor...' : 'Onayla'}
                          </button>
                          <button
                            onClick={() => handleRescheduleResponse(appointment.id, false)}
                            disabled={updating === appointment.id}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {updating === appointment.id ? 'İşleniyor...' : 'Reddet'}
                          </button>
                        </div>
                      </div>
                    )}

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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* İptal Modalı */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Randevu İptal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İptal nedenini belirtiniz
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md resize-none"
                  placeholder="İptal nedenini yazınız..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setSelectedAppointment(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={!cancelReason.trim() || cancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'İptal Ediliyor...' : 'İptal Et'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}