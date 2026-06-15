import 'package:flutter/material.dart';

class NotchedBottomBar extends StatelessWidget {
  const NotchedBottomBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.onChatTap,
    this.chatWidget,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback onChatTap;
  final Widget? chatWidget;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final barColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final activeColor = theme.colorScheme.primary;
    final inactiveColor = isDark ? Colors.grey[600]! : Colors.grey[500]!;

    const items = [
      (Icons.home_outlined, Icons.home, 'Home'),
      (Icons.explore_outlined, Icons.explore, 'Search'),
      (Icons.library_books_outlined, Icons.library_books, 'Library'),
      (Icons.person_outline, Icons.person, 'Settings'),
    ];

    return SizedBox(
      height: 80,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Bar background with notch
          CustomPaint(
            size: const Size(double.infinity, 80),
            painter: _NotchPainter(color: barColor, isDark: isDark),
          ),
          // Nav items (2 left, 2 right, skip center)
          Positioned.fill(
            child: Row(
              children: [
                // Left items (0, 1)
                ...List.generate(
                  2,
                  (i) => Expanded(
                    child: _NavItem(
                      icon: items[i].$1,
                      activeIcon: items[i].$2,
                      label: items[i].$3,
                      isActive: currentIndex == i,
                      activeColor: activeColor,
                      inactiveColor: inactiveColor,
                      onTap: () => onTap(i),
                    ),
                  ),
                ),
                // Center gap for FAB
                const SizedBox(width: 80),
                // Right items (2, 3)
                ...List.generate(
                  2,
                  (i) => Expanded(
                    child: _NavItem(
                      icon: items[i + 2].$1,
                      activeIcon: items[i + 2].$2,
                      label: items[i + 2].$3,
                      isActive: currentIndex == i + 2,
                      activeColor: activeColor,
                      inactiveColor: inactiveColor,
                      onTap: () => onTap(i + 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Center FAB
          Positioned(
            top: -28,
            left: 0,
            right: 0,
            child: Center(
              child: GestureDetector(
                onTap: onChatTap,
                child:
                    chatWidget ??
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: activeColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: activeColor.withOpacity(0.35),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.chat_bubble_outline,
                        color: Colors.white,
                        size: 26,
                      ),
                    ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.activeColor,
    required this.inactiveColor,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final Color activeColor;
  final Color inactiveColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 8),
          Icon(
            isActive ? activeIcon : icon,
            color: isActive ? activeColor : inactiveColor,
            size: 24,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: isActive ? activeColor : inactiveColor,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

class _NotchPainter extends CustomPainter {
  const _NotchPainter({required this.color, required this.isDark});

  final Color color;
  final bool isDark;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = isDark ? Colors.white12 : Colors.black12
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5;

    const notchRadius = 38.0;
    const notchDepth = 28.0;
    const notchWidth = 90.0;
    final cx = size.width / 2;
    const topY = 0.0;

    final path = Path()
      ..moveTo(0, topY)
      ..lineTo(cx - notchWidth / 2, topY)
      // Cubic bezier vào lõm
      ..cubicTo(
        cx - notchWidth / 2 + 20,
        topY,
        cx - notchRadius,
        topY + notchDepth,
        cx,
        topY + notchDepth,
      )
      // Cubic bezier ra khỏi lõm
      ..cubicTo(
        cx + notchRadius,
        topY + notchDepth,
        cx + notchWidth / 2 - 20,
        topY,
        cx + notchWidth / 2,
        topY,
      )
      ..lineTo(size.width, topY)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(path, paint);
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(_NotchPainter old) => old.color != color;
}
