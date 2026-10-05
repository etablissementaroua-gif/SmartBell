import 'package:flutter/material.dart';

class RemoteControllerScreen extends StatefulWidget {
  const RemoteControllerScreen({super.key});

  @override
  State<RemoteControllerScreen> createState() => _RemoteControllerScreenState();
}

class _RemoteControllerScreenState extends State<RemoteControllerScreen> {
  bool _isEmergencyMuted = false;
  String? _activeBell;
  double _masterVolume = 75;

  void _triggerBell(String name, int seconds) {
    setState(() => _activeBell = name);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🔔 جاري رن [$name] لمدة $seconds ثانية...'),
        backgroundColor: const Color(0xFF0D9488),
        duration: const Duration(seconds: 2),
      ),
    );
    Future.delayed(Duration(seconds: seconds), () {
      if (mounted) setState(() => _activeBell = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          title: const Text('SmartBell Controller'),
          actions: [
            Container(
              margin: const EdgeInsets.only(left: 16),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF0D9488)),
              ),
              child: const Row(
                children: [
                  CircleAvatar(radius: 4, backgroundColor: Color(0xFF14B8A6)),
                  SizedBox(width: 6),
                  Text('Pi 5 نشط', style: TextStyle(fontSize: 11, color: Colors.white)),
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
              // 1. Next Event Card
              Container(
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
                        Text('الحدث المجدول القادم', style: TextStyle(color: Color(0xFF14B8A6), fontWeight: FontWeight.bold, fontSize: 13)),
                        Text('10:00 ص', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text('رن جرس الاستراحة التلقائي + تشغيل الإذاعة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(10)),
                      child: const Text('00 : 12 : 08 متبقي', style: TextStyle(color: Color(0xFF14B8A6), fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 2. Big Emergency Silence Button
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFDC2626).withOpacity(0.5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626)),
                        SizedBox(width: 8),
                        Text('صمت الطوارئ العام', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text('كتم فوري لكافة الأجراس والمكبرات في أرجاء المدرسة.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        icon: Icon(_isEmergencyMuted ? Icons.volume_up : Icons.volume_off),
                        label: Text(
                          _isEmergencyMuted ? 'إلغاء صمت الطوارئ' : 'تفعيل الصمت الفوري الكامل',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isEmergencyMuted ? const Color(0xFF0D9488) : const Color(0xFFDC2626),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          setState(() => _isEmergencyMuted = !_isEmergencyMuted);
                        },
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 3. Instant Overrides (أجراس التجاوز الفوري)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('أجراس التجاوز الفوري', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 12),
                    ListTile(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      tileColor: const Color(0xFF0F172A),
                      leading: const Icon(Icons.notifications_active, color: Color(0xFF14B8A6)),
                      title: const Text('جرس الدخول والاصطفاف (20 ثانية)', style: TextStyle(color: Colors.white, fontSize: 13)),
                      trailing: IconButton(
                        icon: const Icon(Icons.play_circle_fill, color: Color(0xFF14B8A6), size: 32),
                        onPressed: () => _triggerBell('جرس الدخول', 20),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ListTile(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      tileColor: const Color(0xFF0F172A),
                      leading: const Icon(Icons.logout, color: Color(0xFF14B8A6)),
                      title: const Text('جرس الانصراف اليومي (15 ثانية)', style: TextStyle(color: Colors.white, fontSize: 13)),
                      trailing: IconButton(
                        icon: const Icon(Icons.play_circle_fill, color: Color(0xFF14B8A6), size: 32),
                        onPressed: () => _triggerBell('جرس الانصراف', 15),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ListTile(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      tileColor: const Color(0xFF0F172A),
                      leading: const Icon(Icons.timer_off, color: Color(0xFF14B8A6)),
                      title: const Text('تنبيه نهاية الحصة (10 ثوانٍ)', style: TextStyle(color: Colors.white, fontSize: 13)),
                      trailing: IconButton(
                        icon: const Icon(Icons.play_circle_fill, color: Color(0xFF14B8A6), size: 32),
                        onPressed: () => _triggerBell('نهاية الحصة', 10),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 4. Master Volume
              Container(
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
                        const Text('مستوى الصوت الرئيسي (Master)', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                        Text('${_masterVolume.toInt()}%', style: const TextStyle(color: Color(0xFF14B8A6), fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Slider(
                      value: _masterVolume,
                      min: 0,
                      max: 100,
                      activeColor: const Color(0xFF14B8A6),
                      inactiveColor: const Color(0xFF0F172A),
                      onChanged: (val) => setState(() => _masterVolume = val),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
