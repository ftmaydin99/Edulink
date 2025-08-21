import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  userName?: string;
  userRole?: 'student' | 'lecturer';
}

export function Header({ userName, userRole }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || event === 'SIGNED_OUT') {
        navigate('/giris-yap');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (userRole === 'lecturer') {
      fetchLecturerUnseenCount();
      
      // Subscribe to changes for lecturers
      const channel = supabase
        .channel('appointments_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments'
          },
          () => {
            fetchLecturerUnseenCount();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } else if (userRole === 'student') {
      fetchStudentUnseenCount();
      
      // Subscribe to changes for students
      const channel = supabase
        .channel('student_appointments_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments'
          },
          () => {
            fetchStudentUnseenCount();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'lecturer' && location.pathname === '/ogretim-elemani/randevu-talepleri') {
      markAppointmentsAsSeen();
    } else if (userRole === 'student' && location.pathname === '/randevularim') {
      markStudentAppointmentsAsSeen();
    }
  }, [location.pathname, userRole]);

  const fetchLecturerUnseenCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('lecturer_id', user.id)
        .eq('is_seen_by_academic', false)
        .eq('status', 'bekliyor');

      setUnseenCount(count || 0);
    } catch (err) {
      console.error('Error fetching unseen count:', err);
    }
  };

  const fetchStudentUnseenCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Count unseen appointments for the student
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('viewed_by_student', false)
        .in('status', ['bekliyor', 'onaylandı', 'iptal', 'awaiting_student_approval']);

      setUnseenCount(count || 0);
    } catch (err) {
      console.error('Error fetching student unseen count:', err);
    }
  };

  const markAppointmentsAsSeen = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('appointments')
        .update({ is_seen_by_academic: true })
        .eq('lecturer_id', user.id)
        .eq('is_seen_by_academic', false);

      setUnseenCount(0);
    } catch (err) {
      console.error('Error marking appointments as seen:', err);
    }
  };

  const markStudentAppointmentsAsSeen = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('appointments')
        .update({ viewed_by_student: true })
        .eq('student_id', user.id)
        .eq('viewed_by_student', false);

      setUnseenCount(0);
    } catch (err) {
      console.error('Error marking student appointments as seen:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  return (
    <header className="bg-[#005baa] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <a 
              href={userRole === 'student' ? '/ogrenci-panel' : userRole === 'lecturer' ? '/ogretim-elemani-panel' : '/'}
              className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity"
            >
              <img 
                src="https://islf.sakarya.edu.tr/assets/saufakulte/images/img_saulogo.png"
                alt="SAU Logo"
                className="h-8 w-auto"
              />
              <div className="ml-2 flex flex-col">
                <span className="text-lg font-semibold leading-tight">SAKARYA ÜNİVERSİTESİ</span>
                <span className="text-sm text-white/90">Edulink</span>
              </div>
            </a>
            <div className="flex items-center space-x-4">
              {userRole === 'student' && (
                <>
                  <a href="/ogrenci-panel" className="hover:text-white/80 transition-colors">Anasayfa</a>
                  <a href="/randevu-al" className="hover:text-white/80 transition-colors">Randevu Al</a>
                  <div className="relative">
                    <a href="/randevularim" className="hover:text-white/80 transition-colors">
                      Randevularım
                      {unseenCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                          {unseenCount}
                        </span>
                      )}
                    </a>
                  </div>
                  <a href="/profil" className="hover:text-white/80 transition-colors">Profil</a>
                  <a href="/hakkimizda" className="hover:text-white/80 transition-colors">Hakkımızda</a>
                  <a href="/iletisim" className="hover:text-white/80 transition-colors">İletişim</a>
                </>
              )}
              {userRole === 'lecturer' && (
                <>
                  <a href="/ogretim-elemani-panel" className="hover:text-white/80 transition-colors">Anasayfa</a>
                  <div className="relative">
                    <a href="/ogretim-elemani/randevu-talepleri" className="hover:text-white/80 transition-colors">
                      Randevu Talepleri
                      {unseenCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                          {unseenCount}
                        </span>
                      )}
                    </a>
                  </div>
                  <a href="/ogretim-elemani/notlarim" className="hover:text-white/80 transition-colors">Notlarım</a>
                  <a href="/profil" className="hover:text-white/80 transition-colors">Profil</a>
                  <a href="/hakkimizda" className="hover:text-white/80 transition-colors">Hakkımızda</a>
                  <a href="/ogretim-elemani/iletisim" className="hover:text-white/80 transition-colors">İletişim</a>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {userName && (
              <div className="flex items-center">
                <a 
                  href="/profil" 
                  className="text-sm font-medium hover:text-white/80 transition-colors cursor-pointer"
                >
                  {userName}
                </a>
                <span className="mx-2 text-white/60">|</span>
                <span className="text-sm text-white/90">{userRole === 'student' ? 'Öğrenci' : 'Akademisyen'}</span>
              </div>
            )}
            {userName && (
              <button
                onClick={handleLogout}
                className="flex items-center text-white hover:text-white/80 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Çıkış
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}