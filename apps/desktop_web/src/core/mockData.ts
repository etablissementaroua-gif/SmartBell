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

export const initialLogs: SystemAuditLog[] = [];

