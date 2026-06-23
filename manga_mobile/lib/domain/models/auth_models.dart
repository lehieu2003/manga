class User {
  const User({
    required this.id,
    required this.email,
    required this.displayName,
    required this.createdAt,
    this.role = 'USER',
    this.avatarUrl,
    this.emailVerifiedAt,
  });

  final String id;
  final String email;
  final String displayName;
  final String role;
  final String? avatarUrl;
  final DateTime createdAt;
  final DateTime? emailVerifiedAt;

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    email: json['email'] as String,
    displayName: json['displayName'] as String,
    role: json['role']?.toString() ?? 'USER',
    avatarUrl: json['avatarUrl'] as String?,
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    emailVerifiedAt: json['emailVerifiedAt'] != null
        ? DateTime.tryParse(json['emailVerifiedAt'].toString())
        : null,
  );
}
