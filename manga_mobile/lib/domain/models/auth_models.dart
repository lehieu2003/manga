class User {
  const User({
    required this.id,
    required this.email,
    required this.displayName,
    required this.createdAt,
    this.role = 'USER',
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String displayName;
  final String role;
  final String? avatarUrl;
  final DateTime createdAt;

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    email: json['email'] as String,
    displayName: json['displayName'] as String,
    role: json['role']?.toString() ?? 'USER',
    avatarUrl: json['avatarUrl'] as String?,
    createdAt:
        DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
  );
}
