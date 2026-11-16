using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed record ListSourceTitle(
    int TmdbId,
    MovieMediaType MediaType,
    string Title,
    string Year,
    string? PosterPath,
    double? VoteAverage,
    int? RuntimeMinutes,
    IReadOnlyList<int> GenreIds)
{
    public MovieListTitle Key => new(TmdbId, MediaType);

    public static ListSourceTitle From(MovieListItem item) => new(
        item.TmdbId,
        item.MediaType,
        item.Title,
        item.Year,
        item.PosterPath,
        item.VoteAverage,
        item.RuntimeMinutes,
        item.GenreIds);

    public static ListSourceTitle From(SavedListTitle title) => new(
        title.TmdbId,
        title.MediaType,
        title.Title,
        title.Year,
        title.PosterPath,
        title.VoteAverage,
        title.RuntimeMinutes,
        title.GenreIds);

    public MovieListItem ToListItem(DateTimeOffset addedAt) => new()
    {
        TmdbId = TmdbId,
        MediaType = MediaType,
        Title = Title,
        Year = Year,
        PosterPath = PosterPath,
        VoteAverage = VoteAverage,
        RuntimeMinutes = RuntimeMinutes,
        GenreIds = GenreIds,
        AddedAt = addedAt
    };

    public SavedListTitle ToSnapshot() => new()
    {
        TmdbId = TmdbId,
        MediaType = MediaType,
        Title = Title,
        Year = Year,
        PosterPath = PosterPath,
        VoteAverage = VoteAverage,
        RuntimeMinutes = RuntimeMinutes,
        GenreIds = GenreIds
    };
}

public sealed record ListSourceContent
{
    private ListSourceContent(
        string? name,
        IReadOnlyList<ListSourceTitle> titles,
        IReadOnlyList<string> posterPaths,
        bool isAvailable)
    {
        Name = name;
        Titles = titles;
        PosterPaths = posterPaths;
        IsAvailable = isAvailable;
    }

    public static ListSourceContent Unavailable { get; } = new(null, [], [], isAvailable: false);

    public string? Name { get; }

    public IReadOnlyList<ListSourceTitle> Titles { get; }

    public IReadOnlyList<string> PosterPaths { get; }

    public bool IsAvailable { get; }

    public string? Description { get; private init; }

    public UserCard? Creator { get; private init; }

    public ListSourceUnavailableReason? UnavailableReason { get; private init; }

    public IReadOnlyList<MovieListTitle> Keys => [.. Titles.Select(title => title.Key)];

    public static ListSourceContent OfCatalog(string? name, IReadOnlyList<ListSourceTitle> titles) =>
        new(name, titles, LeadingPosterPaths(titles), isAvailable: titles.Count > 0);

    public static ListSourceContent OfMemberList(MovieList list, UserCard creator) =>
        new(list.Name, [.. list.Items.Select(ListSourceTitle.From)], list.RecentPosterPaths(), isAvailable: true)
        {
            Description = list.Description,
            Creator = creator
        };

    public static ListSourceContent Withdrawn(ListSourceUnavailableReason reason) =>
        new(null, [], [], isAvailable: false) { UnavailableReason = reason };

    public IReadOnlyList<SavedListTitle> Snapshot() => [.. Titles.Select(title => title.ToSnapshot())];

    private static IReadOnlyList<string> LeadingPosterPaths(IReadOnlyList<ListSourceTitle> titles) =>
    [
        .. titles
            .Select(title => title.PosterPath)
            .OfType<string>()
            .Where(poster => poster.Length > 0)
            .Take(MovieList.SummaryPosterCount)
    ];
}
