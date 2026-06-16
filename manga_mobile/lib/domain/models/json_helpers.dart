List<String> stringList(Object? value) =>
    (value as List<dynamic>? ?? []).map((item) => item.toString()).toList();
