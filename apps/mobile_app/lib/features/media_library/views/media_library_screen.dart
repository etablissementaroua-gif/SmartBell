import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../../core/network/supabase_service.dart';
import '../../../core/theme/app_theme.dart';

/// شاشة مكتبة الأناشيد والوسائط السحابية داخل تطبيق الهاتف
/// تستعلم مباشرة من جدول intermission_tracks في Supabase وتوفر مشغل صوت تجريبي
class MediaLibraryScreen extends StatefulWidget {
  const MediaLibraryScreen({super.key});

  @override
  State<MediaLibraryScreen> createState() => _MediaLibraryScreenState();
}

class _MediaLibraryScreenState extends State<MediaLibraryScreen> {
  final AudioPlayer _player = AudioPlayer();
  List<Map<String, dynamic>> _tracks = [];
  bool _isLoading = true;
  String? _currentlyPlayingId;
  PlayerState _playerState = PlayerState.stopped;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadTracks();

    _player.onPlayerStateChanged.listen((state) {
      if (mounted) {
        setState(() {
          _playerState = state;
          if (state == PlayerState.stopped || state == PlayerState.completed) {
            _currentlyPlayingId = null;
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _loadTracks() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final tracks = await SupabaseService.instance.fetchIntermissionTracks();
      if (mounted) {
        setState(() {
          _tracks = tracks;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'تعذر تحميل المقاطع الصوتية: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _togglePlay(Map<String, dynamic> track) async {
    final trackId = track['id']?.toString() ?? '';
    final audioUrl = track['audio_url']?.toString().trim() ?? '';

    // If currently playing this track, stop it
    if (_currentlyPlayingId == trackId && _playerState == PlayerState.playing) {
      await _player.stop();
      setState(() {
        _currentlyPlayingId = null;
      });
      return;
    }

    // Check for invalid or blob URLs
    if (audioUrl.isEmpty || audioUrl.startsWith('blob:') || audioUrl.contains('dummy')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            audioUrl.startsWith('blob:')
                ? '⚠️ هذا الملف محفوظ محلياً في متصفح الحاسوب برابط (blob) ولم يُرفع لسلة التخزين السحابية بعد.'
                : '⚠️ لا يوجد رابط صوتي صالح لهذا المقطع.',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: Colors.amber.shade900,
        ),
      );
      return;
    }

    try {
      setState(() {
        _currentlyPlayingId = trackId;
      });
      await _player.stop();
      await _player.play(UrlSource(audioUrl));
    } catch (e) {
      if (mounted) {
        setState(() {
          _currentlyPlayingId = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ تعذر تشغيل الصوت: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  String _formatDuration(dynamic sec) {
    final seconds = (sec is int) ? sec : (int.tryParse(sec?.toString() ?? '0') ?? 0);
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  String _categoryLabel(String? cat) {
    switch (cat) {
      case 'NASHEED':
        return 'نشيد تربوي';
      case 'DUAA':
        return 'أذكار ودعاء';
      case 'STORY':
        return 'قصة وعبرة';
      case 'PROVERB':
        return 'حكمة وموعظة';
      case 'QURAN':
        return 'تلاوة قرآنية';
      default:
        return 'مقطع صوتي';
    }
  }

  Color _categoryColor(String? cat) {
    switch (cat) {
      case 'NASHEED':
        return Colors.tealAccent;
      case 'DUAA':
        return const Color(0xFF10B981);
      case 'STORY':
        return Colors.amberAccent;
      case 'PROVERB':
        return Colors.indigoAccent;
      case 'QURAN':
        return Colors.greenAccent;
      default:
        return Colors.teal;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A), // Dark slate deep
        appBar: AppBar(
          backgroundColor: const Color(0xFF1E293B),
          elevation: 2,
          title: const Row(
            children: [
              Icon(Icons.library_music_rounded, color: AppTheme.tealPrimary),
              SizedBox(width: 10),
              Text(
                'مكتبة الأناشيد والوسائط السحابية',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
              tooltip: 'تحديث القائمة',
              onPressed: _loadTracks,
            ),
          ],
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppTheme.tealPrimary),
            SizedBox(height: 16),
            Text(
              'جاري مزامنة المقاطع من سحابة Supabase...',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
          ],
        ),
      );
    }

    if (_errorMessage.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, size: 54, color: Colors.redAccent),
              const SizedBox(height: 12),
              Text(
                _errorMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 14),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _loadTracks,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.tealPrimary,
                  foregroundColor: Colors.black,
                ),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      );
    }

    if (_tracks.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadTracks,
        color: AppTheme.tealPrimary,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(32),
          children: const [
            SizedBox(height: 80),
            Icon(Icons.music_off_rounded, size: 64, color: Colors.white24),
            SizedBox(height: 16),
            Text(
              'لا توجد مقاطع صوتية مرفوعة حالياً',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'قم برفع المقاطع والأناشيد المدرسية من لوحة التحكم لتظهر هنا تلقائياً عبر المزامنة السحابية.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white54, fontSize: 13),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTracks,
      color: AppTheme.tealPrimary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _tracks.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final track = _tracks[index];
          final trackId = track['id']?.toString() ?? '';
          final title = track['title']?.toString() ?? 'بدون عنوان';
          final speaker = track['speaker_or_artist']?.toString() ?? 'الإذاعة المدرسية';
          final category = track['category']?.toString();
          final durationStr = _formatDuration(track['duration_seconds']);
          final audioUrl = track['audio_url']?.toString().trim() ?? '';
          final isBlob = audioUrl.startsWith('blob:');
          final isPlayingThis = _currentlyPlayingId == trackId && _playerState == PlayerState.playing;

          return Container(
            decoration: BoxDecoration(
              color: isPlayingThis ? const Color(0xFF1E3A4C) : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isPlayingThis
                    ? AppTheme.tealPrimary
                    : const Color(0xFF334155),
                width: isPlayingThis ? 2 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                // Play/Stop Action Button
                GestureDetector(
                  onTap: () => _togglePlay(track),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isPlayingThis
                          ? AppTheme.tealPrimary
                          : const Color(0xFF334155),
                    ),
                    child: Icon(
                      isPlayingThis
                          ? Icons.stop_rounded
                          : Icons.play_arrow_rounded,
                      color: isPlayingThis ? const Color(0xFF0F172A) : Colors.white,
                      size: 28,
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Track Metadata
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: isPlayingThis
                                    ? AppTheme.tealPrimary
                                    : Colors.white,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: _categoryColor(category).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _categoryLabel(category),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: _categoryColor(category),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(Icons.person_outline_rounded,
                              size: 14, color: Colors.white.withOpacity(0.5)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              speaker,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.white.withOpacity(0.6),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(Icons.access_time_rounded,
                              size: 13, color: Colors.white.withOpacity(0.5)),
                          const SizedBox(width: 4),
                          Text(
                            durationStr,
                            style: TextStyle(
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: Colors.white.withOpacity(0.7),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Cloud status icon
                          Icon(
                            isBlob
                                ? Icons.cloud_off_rounded
                                : Icons.cloud_done_rounded,
                            size: 14,
                            color: isBlob ? Colors.amberAccent : Colors.tealAccent,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
