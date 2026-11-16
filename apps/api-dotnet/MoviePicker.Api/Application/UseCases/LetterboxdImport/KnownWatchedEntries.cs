using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class KnownWatchedEntries
{
    private readonly Dictionary<(int TmdbId, MovieMediaType MediaType), WatchedTitle?> _entries = [];

    public KnownWatchedEntries(IEnumerable<WatchedTitle> entries)
    {
        foreach (var entry in entries)
            _entries.TryAdd((entry.TmdbId, entry.MediaType), entry);
    }

    public bool Holds(int tmdbId, MovieMediaType mediaType) => _entries.ContainsKey((tmdbId, mediaType));

    public WatchedTitle? Unchanged(int tmdbId, MovieMediaType mediaType) => _entries.GetValueOrDefault((tmdbId, mediaType));

    public void MarkChanged(int tmdbId, MovieMediaType mediaType) => _entries[(tmdbId, mediaType)] = null;
}
