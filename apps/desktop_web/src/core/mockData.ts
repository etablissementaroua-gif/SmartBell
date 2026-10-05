import { BellSchedule, IntermissionTrack, AudioZone, AdhanConfig, SystemAuditLog } from '../types';

export const initialBellSchedules: BellSchedule[] = [];

export const initialIntermissionTracks: IntermissionTrack[] = [];

export const initialAudioZones: AudioZone[] = [
  {
    id: 'zone-1',
    zone_code: 'ZONE_A',
    name: 'ساحة المدرسة والملاعب الخارجية',
    description: '8 مكبرات صوت IP نشطة مع عزل الصدى المفتوح',
    speaker_count: 8,
    status: 'ONLINE',
    volume: 85,
    is_muted: false,
    allow_morning_broadcast: true,
    ip_network: 'VLAN 20 (192.168.20.10-18)',
  },
  {
    id: 'zone-2',
    zone_code: 'ZONE_B',
    name: 'الممرات الداخلية والمطعم',
    description: '12 مكبر صوت سقفي موزع على الطوابق الثلاثة',
    speaker_count: 12,
    status: 'STANDBY',
    volume: 60,
    is_muted: false,
    allow_morning_broadcast: true,
    ip_network: 'VLAN 20 (192.168.20.20-32)',
  },
  {
    id: 'zone-3',
    zone_code: 'ZONE_C',
    name: 'قاعة الأساتذة والمكاتب الإدارية',
    description: '6 مكبرات صوت هادئة مخصصة فقط للأجراس والإشعارات الهامة',
    speaker_count: 6,
    status: 'MUTED',
    volume: 35,
    is_muted: true,
    allow_morning_broadcast: false,
    ip_network: 'VLAN 20 (192.168.20.40-46)',
  },
  {
    id: 'zone-4',
    zone_code: 'ZONE_D',
    name: 'المصلى المدرسي والملحقات',
    description: 'مخصص للأذان والتلاوات القرآنية وخطب صلاة الظهر',
    speaker_count: 4,
    status: 'ONLINE',
    volume: 90,
    is_muted: false,
    allow_morning_broadcast: false,
    ip_network: 'VLAN 20 (192.168.20.50-54)',
  },
];

export const initialAdhanConfig: AdhanConfig = {
  city: 'مراكش (المملكة المغربية)',
  latitude: 31.6295,
  longitude: -7.9811,
  calculation_method: 'وزارة الأوقاف والشؤون الإسلامية (Morocco Awqaf)',
  auto_interrupt: true,
  audio_url: 'أذان الحرم المكي الشريف (عالي النقاوة)',
  dua_after_athan: true,
};

export const initialLogs: SystemAuditLog[] = [
  {
    id: 'log-1',
    event_type: 'إقلاع النظام',
    description: 'تم بدء خدمة smartbell-daemon.service على بوابة Raspberry Pi 5 بنجاح',
    zone: 'العتاد المركزي',
    severity: 'INFO',
    created_at: '06:30:12 ص',
  },
  {
    id: 'log-2',
    event_type: 'مزامنة NTP',
    description: 'تم ضبط التوقيت الموحد محلياً بدقة متناهية عبر خادم NTP ومؤقت DS3231 RTC',
    zone: 'النظام',
    severity: 'INFO',
    created_at: '06:30:15 ص',
  },
  {
    id: 'log-3',
    event_type: 'جرس مجدول',
    description: 'تم تشغيل جرس طابور الصباح والنشيد الوطني تلقائياً لمدة 20 ثانية',
    zone: 'الساحة والملاعب',
    severity: 'INFO',
    created_at: '08:00:00 ص',
  },
  {
    id: 'log-4',
    event_type: 'جرس مجدول',
    description: 'تم تشغيل جرس بداية الحصة الأولى تلقائياً لكافة الزونات',
    zone: 'كافة المناطق',
    severity: 'INFO',
    created_at: '08:15:00 ص',
  },
  {
    id: 'log-5',
    event_type: 'بث إذاعي',
    description: 'بدء بث برنامج الصباح الإذاعي: نفحات تربوية إيمانية',
    zone: 'الساحة والممرات',
    severity: 'INFO',
    created_at: '08:20:00 ص',
  },
];
