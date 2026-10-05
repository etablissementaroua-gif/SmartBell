import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/network/supabase_service.dart';
import '../services/audio_broadcast_service.dart';

class RemoteController extends ChangeNotifier {
  final SupabaseService _supabaseService = SupabaseService.instance;
  final AudioBroadcastService _audioService = AudioBroadcastService();

  // 1. Hardware Daemon Connectivity
  bool _isDaemonOnline = true;
  String _daemonHost = "192.168.1.120";
  DateTime _lastHeartbeat = DateTime.now();
  RealtimeChannel? _realtimeChannel;

  bool get isDaemonOnline => _isDaemonOnline;
  String get daemonHost => _daemonHost;
  DateTime get lastHeartbeat => _lastHeartbeat;

  // 2. Instant Overrides & Emergency State
  bool _isEmergencyMuted = false;
  String? _activeBell;
  int _remainingSeconds = 0;
  Timer? _countdownTimer;

  bool get isEmergencyMuted => _isEmergencyMuted;
  String? get activeBell => _activeBell;
  int get remainingSeconds => _remainingSeconds;

  // 3. Amplifier Master Volume (0 - 100%)
  double _masterVolume = 75.0;
  double get masterVolume => _masterVolume;

  // 4. Target Audio Zones
  String _selectedZone = 'ALL';
  String get selectedZone => _selectedZone;

  final Map<String, String> _availableZones = {
    'ALL': 'كافة أرجاء المدرسة',
    'ZONE_A': 'الساحة العامة والملاعب',
    'ZONE_B': 'الممرات وقاعة المطعم',
    'ZONE_C': 'الإدارة وقاعة الأساتذة',
    'ZONE_D': 'المصلى المدرسي والملحقات',
  };
  Map<String, String> get availableZones => _availableZones;

  // 5. Live Microphone Broadcast
  bool _isMicBroadcasting = false;
  bool _isPushToTalkHeld = false;

  bool get isMicBroadcasting => _isMicBroadcasting;
  bool get isPushToTalkHeld => _isPushToTalkHeld;

  // Status message for SnackBars/Toasts
  String? _statusMessage;
  String? get statusMessage => _statusMessage;

  RemoteController() {
    _initRealtimeSubscription();
  }

  void _initRealtimeSubscription() {
    try {
      final client = _supabaseService.client;
      if (client != null) {
        _realtimeChannel = client.channel('public:live_overrides')
          ..onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'live_overrides',
            callback: (payload) {
              _handleRemoteOverrideUpdate(payload);
            },
          )
          ..subscribe();
      }
    } catch (e) {
      debugPrint("⚠️ [RemoteController] Realtime subscription fallback: $e");
    }
  }

  void _handleRemoteOverrideUpdate(PostgresChangePayload payload) {
    try {
      final newRecord = payload.newRecord;
      if (newRecord.isNotEmpty) {
        final command = newRecord['command'] as String?;
        if (command == 'EMERGENCY_MUTE') {
          _isEmergencyMuted = true;
          _activeBell = null;
          _countdownTimer?.cancel();
        } else if (command == 'RESUME') {
          _isEmergencyMuted = false;
        }
        _lastHeartbeat = DateTime.now();
        _isDaemonOnline = true;
        notifyListeners();
      }
    } catch (e) {
      debugPrint("⚠️ [RemoteController] Error handling payload: $e");
    }
  }

  /// Change targeted audio zone
  void selectZone(String zoneCode) {
    if (_availableZones.containsKey(zoneCode)) {
      _selectedZone = zoneCode;
      notifyListeners();
    }
  }

  /// Set master amplifier volume (0 - 100)
  Future<void> setMasterVolume(double volume) async {
    _masterVolume = volume;
    notifyListeners();

    // 1. Send live override event
    await _supabaseService.sendOverride(
      command: 'PING_TEST',
      targetZone: _selectedZone,
      payload: {'action': 'SET_VOLUME', 'volume': volume.toInt()},
    );

    // 2. Update audio_zones table directly
    final client = _supabaseService.client;
    if (client != null) {
      try {
        if (_selectedZone == 'ALL') {
          await client.from('audio_zones').update({'volume': volume.toInt()}).neq('id', '00000000-0000-0000-0000-000000000000');
        } else {
          await client.from('audio_zones').update({'volume': volume.toInt()}).eq('zone_code', _selectedZone);
        }
      } catch (e) {
        debugPrint("⚠️ [RemoteController] Could not update audio_zones volume: $e");
      }
    }
  }

  /// Trigger instant bell (Entry: 20s, Exit: 15s, Warning: 10s)
  Future<void> triggerBell({
    required String command,
    required String bellName,
    required int durationSeconds,
  }) async {
    if (_isEmergencyMuted) {
      _statusMessage = "⚠️ لا يمكن تشغيل الأجراس أثناء تفعيل صمت الطوارئ العام";
      notifyListeners();
      return;
    }

    _activeBell = bellName;
    _remainingSeconds = durationSeconds;
    _statusMessage = "🔔 جاري رن [$bellName] لمدة $durationSeconds ثانية...";
    notifyListeners();

    // Send command to Supabase live_overrides table
    await _supabaseService.sendOverride(
      command: command,
      targetZone: _selectedZone,
      payload: {'duration_seconds': durationSeconds, 'bell_name': bellName},
    );

    // Run local countdown
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 1) {
        _remainingSeconds--;
        notifyListeners();
      } else {
        _remainingSeconds = 0;
        _activeBell = null;
        timer.cancel();
        notifyListeners();
      }
    });
  }

  /// Toggle Emergency Mute / Resume
  Future<void> toggleEmergencyMute() async {
    final newMuteState = !_isEmergencyMuted;
    _isEmergencyMuted = newMuteState;

    if (newMuteState) {
      _activeBell = null;
      _countdownTimer?.cancel();
      if (_isMicBroadcasting) {
        await stopMicBroadcast();
      }
      _statusMessage = "🛑 تم تفعيل صمت الطوارئ العام - تم كتم كافة المكبرات فورياً";
    } else {
      _statusMessage = "✅ تم إلغاء صمت الطوارئ واستئناف النظام الطبيعي";
    }
    notifyListeners();

    // 1. Send live override event
    await _supabaseService.sendOverride(
      command: newMuteState ? 'EMERGENCY_MUTE' : 'RESUME',
      targetZone: 'ALL',
      payload: {'timestamp': DateTime.now().toIso8601String()},
    );

    // 2. Update is_muted in audio_zones table
    final client = _supabaseService.client;
    if (client != null) {
      try {
        await client.from('audio_zones').update({'is_muted': newMuteState}).neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        debugPrint("⚠️ [RemoteController] Could not update audio_zones mute state: $e");
      }
    }
  }

  /// Start live microphone broadcast to school amplifier
  Future<bool> startMicBroadcast() async {
    if (_isEmergencyMuted) {
      _statusMessage = "⚠️ لا يمكن البث أثناء صمت الطوارئ";
      notifyListeners();
      return false;
    }

    final success = await _audioService.startBroadcast(
      onData: (chunk) {
        // Stream audio chunk to low-latency websocket / UDP daemon endpoint
      },
    );

    if (success) {
      _isMicBroadcasting = true;
      _statusMessage = "🎙️ الميكروفون المباشر نشط الآن ويبث لمضخم الصوت: [${_availableZones[_selectedZone]}]";
      notifyListeners();

      await _supabaseService.sendOverride(
        command: 'MIC_BROADCAST',
        targetZone: _selectedZone,
        payload: {'action': 'START', 'zone': _selectedZone},
      );
      return true;
    }
    return false;
  }

  /// Stop live microphone broadcast
  Future<void> stopMicBroadcast() async {
    await _audioService.stopBroadcast();
    _isMicBroadcasting = false;
    _isPushToTalkHeld = false;
    _statusMessage = "🛑 تم إنهاء البث الصوتي المباشر للميكروفون";
    notifyListeners();

    await _supabaseService.sendOverride(
      command: 'MIC_BROADCAST',
      targetZone: _selectedZone,
      payload: {'action': 'STOP', 'zone': _selectedZone},
    );
  }

  /// Handle Push-to-Talk button press / release
  Future<void> handlePushToTalk(bool isPressed) async {
    if (isPressed) {
      _isPushToTalkHeld = true;
      notifyListeners();
      await startMicBroadcast();
    } else {
      _isPushToTalkHeld = false;
      notifyListeners();
      await stopMicBroadcast();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _realtimeChannel?.unsubscribe();
    _audioService.dispose();
    super.dispose();
  }
}
