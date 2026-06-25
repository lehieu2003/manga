String reactionLabel(String type) {
  return switch (type) {
    'HEART' => 'Heart',
    'SAD' => 'Sad',
    'LAUGH' => 'Laugh',
    'ANGRY' => 'Angry',
    _ => 'Like',
  };
}

String formatCommentDate(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');

  return '${date.year}-$month-$day';
}
