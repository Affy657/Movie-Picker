using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed record ListSourceContent
{
    private ListSourceContent(
        string? name,
        IReadOnlyList<SavedListTitle> titles,
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

    public IReadOnlyList<SavedListTitle> Titles { get; }

    public IReadOnlyList<string> PosterPaths { get; }

    public bool IsAvailable { get; }

    public string? Description { get; private init; }

    public UserCard? Creator { get; private init; }

    public ListSourceUnavailableReason? UnavailableReason { get; private init; }

    public IReadOnlyList<MovieListTitle> Keys => [.. Titles.Select(title => title.Key())];

    public static ListSourceContent OfCatalog(string? name, IReadOnlyList<SavedListTitle> titles) =>
        new(name, titles, LeadingPosterPaths(titles), isAvailable: titles.Count > 0);

    public static ListSourceContent OfMemberList(MovieList list, UserCard creator) =>
        new(list.Name, [.. list.Items.Select(SavedListTitles.From)], list.RecentPosterPaths(), isAvailable: true)
        {
            Description = list.Description,
            Creator = creator
        };

    public static ListSourceContent Withdrawn(ListSourceUnavailableReason reason) =>
        new(null, [], [], isAvailable: false) { UnavailableReason = reason };

    private static IReadOnlyList<string> LeadingPosterPaths(IReadOnlyList<SavedListTitle> titles) =>
    [
        .. titles
            .Select(title => title.PosterPath)
            .OfType<string>()
            .Where(poster => poster.Length > 0)
            .Take(MovieList.SummaryPosterCount)
    ];
}
