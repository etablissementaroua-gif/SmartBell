import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../media_library/views/media_library_screen.dart';

/// غلاف تطبيق الهاتف: يعرض لوحة تحكم SmartBell نفسها المنشورة على الويب
/// لضمان التطابق التام (واجهةً ومنطقاً وبيانات) مع نسخة الحاسوب.
class DashboardShellScreen extends StatefulWidget {
  const DashboardShellScreen({super.key});

  static const String dashboardUrl = 'https://smartbell-9ec8b.web.app/';
  static const String dashboardHost = 'smartbell-9ec8b.web.app';

  @override
  State<DashboardShellScreen> createState() => _DashboardShellScreenState();
}

class _DashboardShellScreenState extends State<DashboardShellScreen> {
  InAppWebViewController? _controller;
  double _progress = 0;
  bool _hasError = false;
  String _errorText = '';

  final InAppWebViewSettings _settings = InAppWebViewSettings(
    javaScriptEnabled: true,
    domStorageEnabled: true,
    databaseEnabled: true,
    // يسمح بتشغيل الأجراس تلقائياً دون انتظار لمسة من المستخدم
    mediaPlaybackRequiresUserGesture: false,
    allowsInlineMediaPlayback: true,
    useWideViewPort: true,
    loadWithOverviewMode: true,
    supportZoom: false,
    builtInZoomControls: false,
    displayZoomControls: false,
    transparentBackground: true,
    useShouldOverrideUrlLoading: true,
    useOnDownloadStart: true,
    cacheMode: CacheMode.LOAD_DEFAULT,
    applicationNameForUserAgent: 'SmartBellAndroid',
  );

  Future<void> _openExternally(Uri uri) async {
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('⚠️ [DashboardShell] Cannot open external url: $e');
    }
  }

  Future<void> _reload() async {
    setState(() {
      _hasError = false;
      _progress = 0;
    });
    if (_controller != null) {
      await _controller!.loadUrl(
        urlRequest: URLRequest(url: WebUri(DashboardShellScreen.dashboardUrl)),
      );
    }
  }

  Future<bool> _handleBack() async {
    if (_controller != null && await _controller!.canGoBack()) {
      await _controller!.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.white,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) async {
          if (didPop) return;
          final shouldExit = await _handleBack();
          if (shouldExit) SystemNavigator.pop();
        },
        child: Scaffold(
          backgroundColor: Colors.white,
          body: SafeArea(
            child: Stack(
              children: [
                InAppWebView(
                  initialUrlRequest: URLRequest(
                    url: WebUri(DashboardShellScreen.dashboardUrl),
                  ),
                  initialSettings: _settings,
                  onWebViewCreated: (controller) => _controller = controller,
                  onProgressChanged: (_, progress) {
                    setState(() => _progress = progress / 100);
                  },
                  onLoadStop: (_, __) => setState(() => _progress = 1),
                  onReceivedError: (_, request, error) {
                    if (request.isForMainFrame ?? false) {
                      setState(() {
                        _hasError = true;
                        _errorText = error.description;
                      });
                    }
                  },
                  // منح إذن الميكروفون/الصوت للوحة عند طلبه
                  onPermissionRequest: (_, request) async {
                    return PermissionResponse(
                      resources: request.resources,
                      action: PermissionResponseAction.GRANT,
                    );
                  },
                  // الروابط الخارجية (مثل تنزيل APK أو GitHub) تُفتح في المتصفح
                  shouldOverrideUrlLoading: (_, action) async {
                    final uri = action.request.url;
                    if (uri == null) return NavigationActionPolicy.ALLOW;
                    final isInternal = uri.host == DashboardShellScreen.dashboardHost ||
                        uri.scheme == 'about' ||
                        uri.scheme == 'blob' ||
                        uri.scheme == 'data';
                    if (isInternal && !uri.path.endsWith('.apk')) {
                      return NavigationActionPolicy.ALLOW;
                    }
                    await _openExternally(uri);
                    return NavigationActionPolicy.CANCEL;
                  },
                  onDownloadStartRequest: (_, request) async {
                    await _openExternally(request.url);
                  },
                ),

                // زر الوصول السريع لمكتبة الأناشيد والوسائط السحابية
                Positioned(
                  top: 10,
                  left: 10,
                  child: Material(
                    elevation: 5,
                    borderRadius: BorderRadius.circular(20),
                    color: const Color(0xFF0F172A).withOpacity(0.92),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const MediaLibraryScreen()),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.tealPrimary.withOpacity(0.5)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.library_music_rounded, color: AppTheme.tealPrimary, size: 16),
                            SizedBox(width: 6),
                            Text(
                              'مكتبة الأناشيد',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                if (_progress < 1 && !_hasError)
                  _LoadingOverlay(progress: _progress),
                if (_hasError)
                  _OfflineView(errorText: _errorText, onRetry: _reload),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LoadingOverlay extends StatelessWidget {
  const _LoadingOverlay({required this.progress});
  final double progress;

  @override
  Widget build(BuildContext context) {
    // شاشة البداية تظهر فقط قبل أول رسم للصفحة، ثم شريط تقدم رفيع
    if (progress > 0.35) {
      return Align(
        alignment: Alignment.topCenter,
        child: LinearProgressIndicator(
          value: progress,
          minHeight: 3,
          color: AppTheme.tealPrimary,
          backgroundColor: Colors.transparent,
        ),
      );
    }
    return Container(
      color: AppTheme.slateNavy,
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Image.asset('assets/images/smartbell_icon.png', width: 104, height: 104),
          ),
          const SizedBox(height: 20),
          const Text(
            'SmartBell',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 6),
          const Text(
            'جاري تحميل لوحة التحكم...',
            style: TextStyle(fontSize: 14, color: AppTheme.tealPrimary),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: 180,
            child: LinearProgressIndicator(
              value: progress == 0 ? null : progress,
              minHeight: 4,
              borderRadius: BorderRadius.circular(4),
              color: AppTheme.tealPrimary,
              backgroundColor: Colors.white12,
            ),
          ),
        ],
      ),
    );
  }
}

class _OfflineView extends StatelessWidget {
  const _OfflineView({required this.errorText, required this.onRetry});
  final String errorText;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.slateNavy,
      padding: const EdgeInsets.all(32),
      alignment: Alignment.center,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 72, color: Colors.redAccent),
            const SizedBox(height: 16),
            const Text(
              'تعذر الاتصال بلوحة التحكم',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              'تحقق من اتصال الهاتف بالإنترنت ثم أعد المحاولة.\n$errorText',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Colors.white60),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              style: FilledButton.styleFrom(backgroundColor: AppTheme.tealPrimary),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }
}
