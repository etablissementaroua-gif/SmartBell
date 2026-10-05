import 'package:flutter/material.dart';
import 'core/network/supabase_service.dart';
import 'core/theme/app_theme.dart';
import 'features/authentication/views/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseService.instance.init();
  runApp(const SmartBellApp());
}

class SmartBellApp extends StatelessWidget {
  const SmartBellApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartBell Controller',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const SmartBellLoginScreen(),
    );
  }
}
