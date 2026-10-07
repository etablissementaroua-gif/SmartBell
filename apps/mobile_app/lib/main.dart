import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'features/web_dashboard_shell/views/dashboard_shell_screen.dart';

/// تطبيق الهاتف يعرض لوحة التحكم الموحدة نفسها المستخدمة على الحاسوب
/// (تسجيل الدخول، الجدولة، الأذان، الإذاعة، المكتبة الصوتية، السجلات، الإعدادات)
/// بحيث تبقى النسختان متطابقتين تلقائياً مع كل تحديث للويب.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SmartBellApp());
}

class SmartBellApp extends StatelessWidget {
  const SmartBellApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartBell',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const DashboardShellScreen(),
    );
  }
}
