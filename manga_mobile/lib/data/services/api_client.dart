import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import 'token_store.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? httpClient, TokenStore? tokenStore, String? baseUrl})
    : _httpClient = httpClient ?? http.Client(),
      tokenStore = tokenStore ?? TokenStore(),
      baseUrl = (baseUrl ?? defaultApiUrl).replaceAll(RegExp(r'/$'), '');

  final http.Client _httpClient;
  final TokenStore tokenStore;
  final String baseUrl;

  static String get defaultApiUrl {
    const fromDefine = String.fromEnvironment('API_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    final fromEnv = dotenv.isInitialized ? dotenv.maybeGet('API_URL') : null;
    if (fromEnv != null && fromEnv.isNotEmpty) return fromEnv;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:4000/api';
    }
    return 'http://localhost:4000/api';
  }

  String assetUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    final origin = Uri.parse(baseUrl).origin;
    final parsed = Uri.tryParse(url);
    if (parsed != null && parsed.hasScheme) {
      final shouldUseApiOrigin =
          !kIsWeb &&
          (parsed.host == 'localhost' || parsed.host == '127.0.0.1');
      if (!shouldUseApiOrigin) return url;
      return '$origin${parsed.path}${parsed.hasQuery ? '?${parsed.query}' : ''}';
    }
    if (!url.startsWith('/')) return url;
    return '$origin$url';
  }

  Future<T> get<T>(
    String path,
    T Function(Map<String, dynamic> json) decode, {
    Map<String, String?> query = const {},
  }) {
    return request(path, decode: decode, query: query);
  }

  Future<T> post<T>(
    String path,
    Map<String, dynamic> body,
    T Function(Map<String, dynamic> json) decode, {
    bool allowRefresh = true,
  }) {
    return request(
      path,
      method: 'POST',
      body: body,
      decode: decode,
      allowRefresh: allowRefresh,
    );
  }

  Future<T> patch<T>(
    String path,
    Map<String, dynamic> body,
    T Function(Map<String, dynamic> json) decode,
  ) {
    return request(path, method: 'PATCH', body: body, decode: decode);
  }

  Future<T> put<T>(
    String path,
    Map<String, dynamic> body,
    T Function(Map<String, dynamic> json) decode,
  ) {
    return request(path, method: 'PUT', body: body, decode: decode);
  }

  Future<T> delete<T>(
    String path,
    T Function(Map<String, dynamic> json) decode,
  ) {
    return request(path, method: 'DELETE', decode: decode);
  }

  Future<T> request<T>(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
    Map<String, String?> query = const {},
    required T Function(Map<String, dynamic> json) decode,
    bool allowRefresh = true,
  }) async {
    final response = await _send(
      path,
      method: method,
      body: body,
      query: query,
    );
    if (response.statusCode == 401 &&
        allowRefresh &&
        await tokenStore.refreshToken != null) {
      await _refreshSession();
      return request(
        path,
        method: method,
        body: body,
        query: query,
        decode: decode,
        allowRefresh: false,
      );
    }
    return _decodeResponse(response, decode);
  }

  Future<T> multipart<T>(
    String path, {
    required String fieldName,
    required String filePath,
    required T Function(Map<String, dynamic> json) decode,
    bool allowRefresh = true,
  }) async {
    final response = await _sendMultipart(
      path,
      fieldName: fieldName,
      filePath: filePath,
    );
    if (response.statusCode == 401 &&
        allowRefresh &&
        await tokenStore.refreshToken != null) {
      await _refreshSession();
      return multipart(
        path,
        fieldName: fieldName,
        filePath: filePath,
        decode: decode,
        allowRefresh: false,
      );
    }
    return _decodeResponse(response, decode);
  }

  Future<http.Response> _send(
    String path, {
    required String method,
    Map<String, dynamic>? body,
    Map<String, String?> query = const {},
  }) async {
    final uri = Uri.parse('$baseUrl$path').replace(
      queryParameters: {
        for (final entry in query.entries)
          if (entry.value != null && entry.value!.isNotEmpty)
            entry.key: entry.value!,
      },
    );
    final token = await tokenStore.accessToken;
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final encoded = body == null ? null : jsonEncode(body);
    return switch (method) {
      'POST' => _httpClient.post(uri, headers: headers, body: encoded),
      'PATCH' => _httpClient.patch(uri, headers: headers, body: encoded),
      'PUT' => _httpClient.put(uri, headers: headers, body: encoded),
      'DELETE' => _httpClient.delete(uri, headers: headers),
      _ => _httpClient.get(uri, headers: headers),
    };
  }

  Future<http.Response> _sendMultipart(
    String path, {
    required String fieldName,
    required String filePath,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final request = http.MultipartRequest('POST', uri);
    final token = await tokenStore.accessToken;
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath(fieldName, filePath));
    final streamed = await _httpClient.send(request);
    return http.Response.fromStream(streamed);
  }

  Future<void> _refreshSession() async {
    final refreshToken = await tokenStore.refreshToken;
    if (refreshToken == null) throw const ApiException('No refresh token');
    final response = await _httpClient.post(
      Uri.parse('$baseUrl/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );
    final payload = _decodeResponse(response, (json) => json);
    await tokenStore.save(
      TokenPair(
        accessToken: payload['accessToken'] as String,
        refreshToken: payload['refreshToken'] as String,
      ),
    );
  }

  T _decodeResponse<T>(
    http.Response response,
    T Function(Map<String, dynamic> json) decode,
  ) {
    final raw = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);
    final json = raw is Map<String, dynamic>
        ? raw
        : <String, dynamic>{'data': raw};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = json['error'];
      final message = error is Map<String, dynamic>
          ? error['message']?.toString()
          : 'Request failed with ${response.statusCode}';
      throw ApiException(
        message ?? 'Request failed',
        statusCode: response.statusCode,
      );
    }
    return decode(json);
  }
}
