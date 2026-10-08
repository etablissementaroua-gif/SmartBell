import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'supabase_config.dart';

class SupabaseService {
  static final SupabaseService instance = SupabaseService._internal();
  SupabaseService._internal();

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  SupabaseClient? get client {
    if (!_isInitialized) return null;
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  Future<void> init() async {
    try {
      await Supabase.initialize(
        url: SupabaseConfig.supabaseUrl,
        anonKey: SupabaseConfig.supabaseAnonKey,
      );
      _isInitialized = true;
      debugPrint("✅ [SupabaseService] Initialized successfully.");
    } catch (e) {
      debugPrint("⚠️ [SupabaseService] Offline or fallback mode: $e");
      _isInitialized = false;
    }
  }

  Future<bool> sendOverride({
    required String command,
    required String targetZone,
    String initiator = 'المشرف المتنقل (تطبيق الهاتف)',
    Map<String, dynamic>? payload,
  }) async {
    if (client == null) {
      debugPrint("⚡ [Offline Fallback] Command: $command on zone: $targetZone");
      return true;
    }

    try {
      await client!.from('live_overrides').insert({
        'command': command,
        'target_zone': targetZone,
        'initiator': initiator,
        'payload': payload ?? {},
        'is_executed': false,
      });
      debugPrint("🚀 [SupabaseService] Override sent: $command to $targetZone");
      return true;
    } catch (e) {
      debugPrint("❌ [SupabaseService] Failed to send override: $e");
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> fetchIntermissionTracks() async {
    if (client == null) {
      debugPrint("⚠️ [SupabaseService] Client not ready, initializing now...");
      await init();
      if (client == null) return [];
    }

    try {
      final List<dynamic> response = await client!
          .from('intermission_tracks')
          .select('*')
          .order('play_order', ascending: true);
      debugPrint("🎵 [SupabaseService] Fetched ${response.length} tracks directly from cloud database");
      return response.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    } catch (e) {
      debugPrint("❌ [SupabaseService] Error fetching intermission tracks: $e");
      return [];
    }
  }

  Stream<List<Map<String, dynamic>>> streamIntermissionTracks() {
    if (client == null) {
      return Stream.value([]);
    }
    return client!
        .from('intermission_tracks')
        .stream(primaryKey: ['id'])
        .order('play_order', ascending: true);
  }
}
