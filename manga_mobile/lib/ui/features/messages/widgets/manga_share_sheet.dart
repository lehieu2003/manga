import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../domain/models/models.dart';
import '../../../app_state.dart';
import '../cubit/messages_cubit.dart';

class MangaShareSheet extends StatefulWidget {
  const MangaShareSheet({super.key});

  @override
  State<MangaShareSheet> createState() => _MangaShareSheetState();
}

class _MangaShareSheetState extends State<MangaShareSheet> {
  final _searchController = TextEditingController();
  List<MangaSummary> _results = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _search();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await AppScope.read(
        context,
      ).catalogRepository.searchManga(query: _searchController.text, limit: 12);
      if (!mounted) return;
      setState(() => _results = response.data);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _share(MangaSummary manga) async {
    await context.read<MessagesCubit>().sendMangaShare(manga.id);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottomInset),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.72,
          child: Column(
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Share manga',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SearchBar(
                controller: _searchController,
                hintText: 'Search manga',
                leading: const Icon(Icons.search),
                trailing: [
                  IconButton(
                    tooltip: 'Search manga',
                    onPressed: _search,
                    icon: const Icon(Icons.arrow_forward),
                  ),
                ],
                onSubmitted: (_) => _search(),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                    ? Center(child: Text(_error!))
                    : _results.isEmpty
                    ? const Center(child: Text('No manga found'))
                    : ListView.separated(
                        itemCount: _results.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final manga = _results[index];
                          return ListTile(
                            leading: _Cover(url: manga.coverUrl),
                            title: Text(
                              manga.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            subtitle: Text(
                              [
                                if (manga.status != null) manga.status,
                                if (manga.year != null) '${manga.year}',
                              ].join(' · '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: IconButton.filledTonal(
                              tooltip: 'Share ${manga.title}',
                              onPressed: () => _share(manga),
                              icon: const Icon(Icons.send),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Cover extends StatelessWidget {
  const _Cover({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final resolved = url == null
        ? null
        : AppScope.read(context).catalogRepository.assetUrl(url);
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: SizedBox(
        width: 42,
        height: 56,
        child: resolved == null || resolved.isEmpty
            ? ColoredBox(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: const Icon(Icons.menu_book_outlined),
              )
            : Image.network(resolved, fit: BoxFit.cover),
      ),
    );
  }
}
