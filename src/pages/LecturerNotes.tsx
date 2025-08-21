import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  AlertCircle,
  Edit3,
  Save,
  X
} from 'lucide-react';

interface AppointmentNote {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  student_name: string;
  student_email: string;
  student_faculty: string;
  student_department: string;
  student_year: string;
  subject: string;
  message: string;
  meeting_note?: string;
  reschedule_reason?: string;
  status: string;
  meeting_status?: string;
  is_follow_up: boolean;
  created_by_faculty: boolean;
  processed_at?: string;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
type StatusFilter = 'all' | 'bekliyor' | 'onaylandı' | 'iptal' | 'awaiting_student_approval';
type MeetingStatusFilter = 'all' | 'yapıldı' | 'yapılmadı';

export function LecturerNotes() {
  const navigate = useNavigate();
  const [lecturer, setLecturer] = useState<{ name: string } | null>(null);
  const [appointments, setAppointments] = useState<AppointmentNote[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState<MeetingStatusFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Expanded notes state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  
  // Edit states
  const [editingMeetingNote, setEditingMeetingNote] = useState<string | null>(null);
  const [editingRescheduleReason, setEditingRescheduleReason] = useState<string | null>(null);
  const [editMeetingNoteValue, setEditMeetingNoteValue] = useState('');
  const [editRescheduleReasonValue, setEditRescheduleReasonValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchLecturerData();
    fetchAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, searchTerm, dateFilter, statusFilter, meetingStatusFilter, customDate]);

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
      setError('Öğretim görevlisi bilgileri yüklenirken hata oluştu');
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          start_time,
          end_time,
          student_name,
          student_email,
          student_faculty,
          student_department,
          student_year,
          subject,
          message,
          meeting_note,
          reschedule_reason,
          status,
          meeting_status,
          is_follow_up,
          created_by_faculty,
          processed_at
        `)
        .eq('lecturer_id', user.id)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (fetchError) throw fetchError;

      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Randevular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
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

  const applyFilters = () => {
    let filtered = [...appointments];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(appointment =>
        appointment.student_name.toLowerCase().includes(searchLower) ||
        appointment.student_email.toLowerCase().includes(searchLower) ||
        appointment.subject?.toLowerCase().includes(searchLower) ||
        appointment.meeting_note?.toLowerCase().includes(searchLower) ||
        appointment.reschedule_reason?.toLowerCase().includes(searchLower)
      );
    }

    // Date filter
    const dateRange = getDateRange(dateFilter, customDate);
    if (dateRange) {
      filtered = filtered.filter(appointment =>
        appointment.date >= dateRange.start && appointment.date <= dateRange.end
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    // Meeting status filter
    if (meetingStatusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.meeting_status === meetingStatusFilter);
    }

    setFilteredAppointments(filtered);
  };

  const toggleNoteExpansion = (appointmentId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(appointmentId)) {
      newExpanded.delete(appointmentId);
    } else {
      newExpanded.add(appointmentId);
    }
    setExpandedNotes(newExpanded);
  };

  const startEditingMeetingNote = (appointmentId: string, currentNote: string) => {
    setEditingMeetingNote(appointmentId);
    setEditMeetingNoteValue(currentNote || '');
  };

  const startEditingRescheduleReason = (appointmentId: string, currentReason: string) => {
    setEditingRescheduleReason(appointmentId);
    setEditRescheduleReasonValue(currentReason || '');
  };

  const cancelEditing = () => {
    setEditingMeetingNote(null);
    setEditingRescheduleReason(null);
    setEditMeetingNoteValue('');
    setEditRescheduleReasonValue('');
  };

  const saveMeetingNote = async (appointmentId: string) => {
    try {
      setSaving(appointmentId);
      
      const { error } = await supabase
        .from('appointments')
        .update({ meeting_note: editMeetingNoteValue.trim() || null })
        .eq('id', appointmentId);

      if (error) throw error;

      // Update local state
      setAppointments(prev => prev.map(app => 
        app.id === appointmentId 
          ? { ...app, meeting_note: editMeetingNoteValue.trim() || undefined }
          : app
      ));

      setEditingMeetingNote(null);
      setEditMeetingNoteValue('');
    } catch (err) {
      console.error('Error saving meeting note:', err);
      setError('Toplantı notu kaydedilirken hata oluştu');
    } finally {
      setSaving(null);
    }
  };

  const saveRescheduleReason = async (appointmentId: string) => {
    try {
      setSaving(appointmentId);
      
      const { error } = await supabase
        .from('appointments')
        .update({ reschedule_reason: editRescheduleReasonValue.trim() || null })
        .eq('id', appointmentId);

      if (error) throw error;

      // Update local state
      setAppointments(prev => prev.map(app => 
        app.id === appointmentId 
          ? { ...app, reschedule_reason: editRescheduleReasonValue.trim() || undefined }
          : app
      ));

      setEditingRescheduleReason(null);
      setEditRescheduleReasonValue('');
    } catch (err) {
      console.error('Error saving reschedule reason:', err);
      setError('Erteleme nedeni kaydedilirken hata oluştu');
    } finally {
      setSaving(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bekliyor':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Bekliyor
        </span>;
      case 'onaylandı':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Onaylandı
        </span>;
      case 'iptal':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          İptal
        </span>;
      case 'awaiting_student_approval':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Erteleme Onayı
        </span>;
      default:
        return null;
    }
  };

  const getMeetingStatusBadge = (meetingStatus?: string) => {
    if (!meetingStatus) return null;
    
    switch (meetingStatus) {
      case 'yapıldı':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Yapıldı
        </span>;
      case 'yapılmadı':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Yapılmadı
        </span>;
      default:
        return null;
    }
  };

  const getAppointmentTypeBadge = (appointment: AppointmentNote) => {
    if (appointment.subject === 'Takip Toplantısı' && appointment.is_follow_up && appointment.created_by_faculty) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Takip Toplantısı
      </span>;
    } else if (appointment.subject === 'Ertelenen Toplantı') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        Ertelenen Toplantı
      </span>;
    }
    return null;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setStatusFilter('all');
    setMeetingStatusFilter('all');
    setCustomDate('');
    setShowDatePicker(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header userName={lecturer?.name} userRole="lecturer" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005baa]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header userName={lecturer?.name} userRole="lecturer" />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notlarım</h1>
            <p className="mt-1 text-sm text-gray-500">
              Öğrencilerle yaptığınız toplantılara ait notlar ve bilgiler
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Öğrenci adı, e-posta, konu veya notlarda ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#005baa] focus:border-[#005baa]"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Filter */}
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
                    Tümü
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

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Durum:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#005baa] focus:border-[#005baa] text-sm"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="bekliyor">Bekliyor</option>
                  <option value="onaylandı">Onaylandı</option>
                  <option value="iptal">İptal</option>
                  <option value="awaiting_student_approval">Erteleme Onayı</option>
                </select>
              </div>

              {/* Meeting Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Toplantı:</span>
                <select
                  value={meetingStatusFilter}
                  onChange={(e) => setMeetingStatusFilter(e.target.value as MeetingStatusFilter)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#005baa] focus:border-[#005baa] text-sm"
                >
                  <option value="all">Tüm Toplantılar</option>
                  <option value="yapıldı">Yapıldı</option>
                  <option value="yapılmadı">Yapılmadı</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(searchTerm || dateFilter !== 'all' || statusFilter !== 'all' || meetingStatusFilter !== 'all' || customDate) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Toplantı Notları ({filteredAppointments.length})
              </h2>
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {error && (
            <div className="p-6 text-red-600 bg-red-50">
              {error}
            </div>
          )}

          <div className="divide-y divide-gray-200">
            {filteredAppointments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm || dateFilter !== 'all' || statusFilter !== 'all' || meetingStatusFilter !== 'all' || customDate
                  ? 'Arama kriterlerine uygun toplantı bulunamadı'
                  : 'Henüz toplantı notunuz bulunmamaktadır'}
              </div>
            ) : (
              filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{appointment.student_name}</span>
                        </div>
                        {getAppointmentTypeBadge(appointment)}
                        {getStatusBadge(appointment.status)}
                        {getMeetingStatusBadge(appointment.meeting_status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>E-posta:</strong> {appointment.student_email}</p>
                        <p><strong>Fakülte:</strong> {appointment.student_faculty}</p>
                        <p><strong>Bölüm:</strong> {appointment.student_department}</p>
                        <p><strong>Sınıf:</strong> {appointment.student_year}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(parseISO(appointment.date), 'd MMMM yyyy', { locale: tr })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{appointment.start_time} - {appointment.end_time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subject and Message */}
                  {appointment.subject && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900 mb-1">Konu</p>
                      <p className="text-gray-700">{appointment.subject}</p>
                    </div>
                  )}

                  {appointment.message && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-gray-900 mb-1">Öğrenci Mesajı</p>
                      <p className="text-gray-700">{appointment.message}</p>
                    </div>
                  )}

                  {/* Meeting Note - Editable */}
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <p className="font-medium text-gray-900">Toplantı Notunuz</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {appointment.meeting_note && appointment.meeting_note.length > 150 && (
                          <button
                            onClick={() => toggleNoteExpansion(appointment.id)}
                            className="text-green-600 hover:text-green-700 transition-colors"
                          >
                            {expandedNotes.has(appointment.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {editingMeetingNote !== appointment.id && (
                          <button
                            onClick={() => startEditingMeetingNote(appointment.id, appointment.meeting_note || '')}
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title="Düzenle"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {editingMeetingNote === appointment.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editMeetingNoteValue}
                          onChange={(e) => setEditMeetingNoteValue(e.target.value)}
                          rows={4}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa] resize-none"
                          placeholder="Toplantı notunuzu buraya yazın..."
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveMeetingNote(appointment.id)}
                            disabled={saving === appointment.id}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <Save className="h-3 w-3" />
                            {saving === appointment.id ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {appointment.meeting_note ? (
                          <p className="text-gray-700">
                            {appointment.meeting_note.length > 150 && !expandedNotes.has(appointment.id)
                              ? `${appointment.meeting_note.substring(0, 150)}...`
                              : appointment.meeting_note}
                          </p>
                        ) : (
                          <p className="text-gray-500 italic">Henüz toplantı notu eklenmemiş</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reschedule Reason - Editable */}
                  {(appointment.reschedule_reason || appointment.status === 'awaiting_student_approval' || appointment.status === 'iptal') && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-yellow-600" />
                          <p className="font-medium text-gray-900">Erteleme/İptal Nedeni</p>
                        </div>
                        {editingRescheduleReason !== appointment.id && (
                          <button
                            onClick={() => startEditingRescheduleReason(appointment.id, appointment.reschedule_reason || '')}
                            className="text-yellow-600 hover:text-yellow-700 transition-colors"
                            title="Düzenle"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      {editingRescheduleReason === appointment.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editRescheduleReasonValue}
                            onChange={(e) => setEditRescheduleReasonValue(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#005baa] focus:border-[#005baa] resize-none"
                            placeholder="Erteleme/iptal nedenini buraya yazın..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveRescheduleReason(appointment.id)}
                              disabled={saving === appointment.id}
                              className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50"
                            >
                              <Save className="h-3 w-3" />
                              {saving === appointment.id ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                            >
                              <X className="h-3 w-3" />
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {appointment.reschedule_reason ? (
                            <p className="text-gray-700">{appointment.reschedule_reason}</p>
                          ) : (
                            <p className="text-gray-500 italic">Henüz neden belirtilmemiş</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Processed Info */}
                  {appointment.processed_at && (
                    <div className="text-xs text-gray-500 mt-4">
                      İşlem Tarihi: {format(parseISO(appointment.processed_at), 'd MMMM yyyy HH:mm', { locale: tr })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}