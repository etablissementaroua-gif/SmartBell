import 'package:flutter/material.dart';
import '../controllers/remote_controller.dart';

class RemoteControllerScreen extends StatefulWidget {
  const RemoteControllerScreen({super.key});

  @override
  State<RemoteControllerScreen> createState() => _RemoteControllerScreenState();
}

class _RemoteControllerScreenState extends State<RemoteControllerScreen>
    with SingleTickerProviderStateMixin {
  late final RemoteController _controller;
  late final AnimationController _pulseAnimController;

  @override
  void initState() {
    super.initState();
    _controller = RemoteController();
    _controller.addListener(_onControllerUpdate);

    _pulseAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  void _onControllerUpdate() {
    if (mounted) {
      setState(() {});
      if (_controller.statusMessage != null) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _controller.statusMessage!,
              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
            ),
            backgroundColor: _controller.isEmergencyMuted
                ? const Color(0xFFDC2626)
                : const Color(0xFF0D9488),
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _pulseAnimController.dispose();
    _controller.removeListener(_onControllerUpdate);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F172A),
          elevation: 0,
          title: const Row(
            children: [
              Icon(Icons.cell_tower, color: Color(0xFF14B8A6), size: 26),
              SizedBox(width: 8),
              Text(
                'SmartBell Controller',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          actions: [
            // Top Hardware Status Banner
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _controller.isDaemonOnline
                      ? const Color(0xFF14B8A6).withOpacity(0.8)
                      : const Color(0xFFDC2626),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FadeTransition(
                    opacity: _pulseAnimController,
                    child: CircleAvatar(
                      radius: 4.5,
                      backgroundColor: _controller.isDaemonOnline
                          ? const Color(0xFF10B981)
                          : const Color(0xFFDC2626),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _controller.isDaemonOnline
                        ? 'العتاد متصل (${_controller.daemonHost})'
                        : 'غير متصل بالعتاد',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Audio Zones Selector (محدد مناطق البث الصوتي)
              _buildZoneSelectorSection(),

              const SizedBox(height: 16),

              // 2. Big Emergency Silence Button (زر صمت الطوارئ العام الأحمر)
              _buildEmergencySilenceSection(),

              const SizedBox(height: 16),

              // 3. Live Mic to Amplifier (ميزة الميكروفون المباشر)
              _buildLiveMicSection(),

              const SizedBox(height: 16),

              // 4. Instant Overrides (أزرار التجاوز الفوري)
              _buildInstantOverridesSection(),

              const SizedBox(height: 16),

              // 5. Master Volume Control (شريط تحكم مستوى الصوت العام)
              _buildMasterVolumeSection(),

              const SizedBox(height: 16),

              // 6. Next Scheduled Bell Card (الحدث القادم في جدول اليوم)
              _buildNextScheduledEventCard(),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  /// 1. Audio Zones Selector
  Widget _buildZoneSelectorSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.speaker_group, color: Color(0xFF14B8A6), size: 20),
              SizedBox(width: 8),
              Text(
                'منطقة توجيه الصوت المستهدفة',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _controller.availableZones.entries.map((entry) {
                final isSelected = _controller.selectedZone == entry.key;
                return Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: FilterChip(
                    selected: isSelected,
                    label: Text(
                      entry.value,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.black : const Color(0xFFCBD5E1),
                      ),
                    ),
                    backgroundColor: const Color(0xFF0F172A),
                    selectedColor: const Color(0xFF14B8A6),
                    checkmarkColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(
                        color: isSelected ? const Color(0xFF14B8A6) : const Color(0xFF334155),
                      ),
                    ),
                    onSelected: (selected) {
                      if (selected) {
                        _controller.selectZone(entry.key);
                      }
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  /// 2. Big Emergency Silence Section
  Widget _buildEmergencySilenceSection() {
    final isMuted = _controller.isEmergencyMuted;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isMuted ? const Color(0xFF450A0A) : const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isMuted ? const Color(0xFFDC2626) : const Color(0xFFDC2626).withOpacity(0.4),
          width: isMuted ? 2 : 1,
        ),
        boxShadow: isMuted
            ? [
                BoxShadow(
                  color: const Color(0xFFDC2626).withOpacity(0.3),
                  blurRadius: 16,
                  spreadRadius: 2,
                )
              ]
            : [],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isMuted ? Icons.volume_off : Icons.warning_amber_rounded,
                color: const Color(0xFFDC2626),
                size: 26,
              ),
              const SizedBox(width: 8),
              Text(
                'صمت الطوارئ العام (الأولوية القصوى)',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: isMuted ? Colors.white : const Color(0xFFEF4444),
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            isMuted
                ? '⚠️ النظام الآن في وضع الصمت التام! كافة الأجراس والإذاعة معطلة لحظياً.'
                : 'كتم فوري لكافة الأجراس والمكبرات في أرجاء المدرسة بنقرة واحدة.',
            style: const TextStyle(
              fontFamily: 'Cairo',
              color: Color(0xFF94A3B8),
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              icon: Icon(
                isMuted ? Icons.volume_up : Icons.power_settings_new,
                size: 24,
                color: Colors.white,
              ),
              label: Text(
                isMuted ? 'إلغاء صمت الطوارئ واستئناف البث' : 'تفعيل صمت الطوارئ العام الفوري',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: isMuted ? const Color(0xFF0D9488) : const Color(0xFFDC2626),
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => _controller.toggleEmergencyMute(),
            ),
          ),
        ],
      ),
    );
  }

  /// 3. Live Mic to Amplifier Section
  Widget _buildLiveMicSection() {
    final isBroadcasting = _controller.isMicBroadcasting;
    final isHeld = _controller.isPushToTalkHeld;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isBroadcasting ? const Color(0xFF14B8A6) : const Color(0xFF334155),
          width: isBroadcasting ? 2 : 1,
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.mic,
                    color: isBroadcasting ? const Color(0xFF14B8A6) : const Color(0xFF94A3B8),
                    size: 22,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'الميكروفون المباشر (Live Mic)',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
              // Broadcast Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isBroadcasting
                      ? const Color(0xFF14B8A6).withOpacity(0.2)
                      : const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isBroadcasting ? const Color(0xFF14B8A6) : const Color(0xFF334155),
                  ),
                ),
                child: Text(
                  isBroadcasting ? '🎙️ البث المباشر نشط' : 'المايك في وضع الاستعداد',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isBroadcasting ? const Color(0xFF14B8A6) : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            isBroadcasting
                ? 'جاري نقل صوتك إلى مكبرات: ${_controller.availableZones[_controller.selectedZone]}'
                : 'اضغط واستمر بالضغط للتحدث الفوري، أو فعّل مفتاح البث المستمر.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Cairo',
              color: Color(0xFF94A3B8),
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 18),

          // Central Push-to-Talk Circular Button
          Center(
            child: GestureDetector(
              onTapDown: (_) => _controller.handlePushToTalk(true),
              onTapUp: (_) => _controller.handlePushToTalk(false),
              onTapCancel: () => _controller.handlePushToTalk(false),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 105,
                height: 105,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: isBroadcasting || isHeld
                        ? [const Color(0xFF0D9488), const Color(0xFF14B8A6)]
                        : [const Color(0xFF1E293B), const Color(0xFF334155)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: (isBroadcasting || isHeld)
                      ? [
                          BoxShadow(
                            color: const Color(0xFF14B8A6).withOpacity(0.5),
                            blurRadius: 24,
                            spreadRadius: 6,
                          )
                        ]
                      : [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.3),
                            blurRadius: 10,
                          )
                        ],
                  border: Border.all(
                    color: isBroadcasting || isHeld
                        ? Colors.white
                        : const Color(0xFF14B8A6).withOpacity(0.5),
                    width: 3,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isBroadcasting || isHeld ? Icons.mic : Icons.mic_none,
                      size: 40,
                      color: isBroadcasting || isHeld ? Colors.white : const Color(0xFF14B8A6),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isHeld ? 'تحدث الآن' : 'اضغط للتحدث',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isBroadcasting || isHeld ? Colors.white : const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Continuous Mic Broadcast Switch
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'بث مستمر بدون ضغط:',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Color(0xFFCBD5E1),
                  fontSize: 13,
                ),
              ),
              const SizedBox(width: 8),
              Switch(
                value: isBroadcasting && !isHeld,
                activeColor: const Color(0xFF14B8A6),
                inactiveTrackColor: const Color(0xFF0F172A),
                onChanged: (val) {
                  if (val) {
                    _controller.startMicBroadcast();
                  } else {
                    _controller.stopMicBroadcast();
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 4. Instant Overrides Section
  Widget _buildInstantOverridesSection() {
    final active = _controller.activeBell;
    final remaining = _controller.remainingSeconds;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'أجراس التجاوز الفوري (Instant Overrides)',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              if (active != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D9488),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'رنين نشط: $remaining ث',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Instant Entry Bell (20s)
          _buildBellTile(
            title: 'جرس الدخول والاصطفاف (20 ثانية)',
            subtitle: 'يطلق نغمة الدخول الصباحي للساحة',
            icon: Icons.notifications_active,
            bellName: 'جرس الدخول',
            command: 'INSTANT_ENTRY',
            durationSeconds: 20,
            color: const Color(0xFF14B8A6),
          ),

          const SizedBox(height: 8),

          // Instant Exit Bell (15s)
          _buildBellTile(
            title: 'جرس الانصراف اليومي (15 ثانية)',
            subtitle: 'نغمة مغادرة الطلاب وانقضاء الدوام',
            icon: Icons.logout,
            bellName: 'جرس الانصراف',
            command: 'INSTANT_EXIT',
            durationSeconds: 15,
            color: const Color(0xFF38BDF8),
          ),

          const SizedBox(height: 8),

          // Period End Warning Bell (10s)
          _buildBellTile(
            title: 'تنبيه نهاية الحصة (10 ثوانٍ)',
            subtitle: 'رنة قصيرة لتنبيه المعلمين والطلاب',
            icon: Icons.timer_outlined,
            bellName: 'تنبيه نهاية الحصة',
            command: 'PERIOD_END',
            durationSeconds: 10,
            color: const Color(0xFFFBBF24),
          ),
        ],
      ),
    );
  }

  Widget _buildBellTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required String bellName,
    required String command,
    required int durationSeconds,
    required Color color,
  }) {
    final isRinging = _controller.activeBell == bellName;

    return Container(
      decoration: BoxDecoration(
        color: isRinging ? color.withOpacity(0.15) : const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRinging ? color : const Color(0xFF334155),
          width: isRinging ? 1.5 : 1,
        ),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isRinging ? color : const Color(0xFF1E293B),
          child: Icon(icon, color: isRinging ? Colors.white : color, size: 22),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontFamily: 'Cairo',
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(fontFamily: 'Cairo', color: Color(0xFF94A3B8), fontSize: 11),
        ),
        trailing: isRinging
            ? SizedBox(
                width: 38,
                height: 38,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
              )
            : IconButton(
                icon: Icon(Icons.play_circle_fill, color: color, size: 36),
                onPressed: () => _controller.triggerBell(
                  command: command,
                  bellName: bellName,
                  durationSeconds: durationSeconds,
                ),
              ),
      ),
    );
  }

  /// 5. Master Volume Section
  Widget _buildMasterVolumeSection() {
    final vol = _controller.masterVolume;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    vol == 0
                        ? Icons.volume_off
                        : vol > 50
                            ? Icons.volume_up
                            : Icons.volume_down,
                    color: const Color(0xFF14B8A6),
                    size: 22,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'مستوى صوت المضخم العام (Master Volume)',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Text(
                '${vol.toInt()}%',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: Color(0xFF14B8A6),
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Slider(
            value: vol,
            min: 0,
            max: 100,
            activeColor: const Color(0xFF14B8A6),
            inactiveColor: const Color(0xFF0F172A),
            onChanged: (val) => _controller.setMasterVolume(val),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () => _controller.setMasterVolume(0),
                child: const Text('كتم (0%)', style: TextStyle(fontFamily: 'Cairo', color: Color(0xFF94A3B8), fontSize: 11)),
              ),
              TextButton(
                onPressed: () => _controller.setMasterVolume(50),
                child: const Text('متوسط (50%)', style: TextStyle(fontFamily: 'Cairo', color: Color(0xFF94A3B8), fontSize: 11)),
              ),
              TextButton(
                onPressed: () => _controller.setMasterVolume(85),
                child: const Text('المثالي (85%)', style: TextStyle(fontFamily: 'Cairo', color: Color(0xFF14B8A6), fontSize: 11)),
              ),
              TextButton(
                onPressed: () => _controller.setMasterVolume(100),
                child: const Text('الأقصى (100%)', style: TextStyle(fontFamily: 'Cairo', color: Color(0xFF94A3B8), fontSize: 11)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 6. Next Scheduled Event Card
  Widget _buildNextScheduledEventCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131B2E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF0D9488).withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'الحدث المجدول القادم',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Color(0xFF14B8A6),
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              Text(
                '10:00 ص',
                style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'رن جرس الاستراحة التلقائي + تشغيل إذاعة الفسحة',
            style: TextStyle(
              fontFamily: 'Cairo',
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Text(
              '00 : 12 : 08 متبقي',
              style: TextStyle(
                color: Color(0xFF14B8A6),
                fontSize: 18,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
