import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'features/authentication/views/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
