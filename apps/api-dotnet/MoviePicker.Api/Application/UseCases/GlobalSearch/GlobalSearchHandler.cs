using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GlobalSearch;

public sealed class GlobalSearchHandler : IGlobalSearchHandler
{
    public const int TitleLimit = 5;
    public const int SectionLimit = 4;

    private readonly ITmdbMovieSearch _tmdb;
    private readonly IGetMovieCollectionsHandler _sagas;
    private readonly ISearchUsersHandler _members;
    private readonly MySpaceSearch _mySpace;
    private readonly PublicListSearch _publicLists;
    private readonly MoviePickerOptions _options;

    public GlobalSearchHandler(
        ITmdbMovieSearch tmdb,
        IGetMovieCollectionsHandler sagas,
        ISearchUsersHandler members,
        MySpaceSearch mySpace,
        PublicListSearch publicLists,
        IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _sagas = sagas;
        _members = members;
        _mySpace = mySpace;
        _publicLists = publicLists;
        _options = options.Value;
    }

    public async Task<GlobalSearchResponse> HandleAsync(string? query, string? currentUserId, CancellationToken ct = default)
    {
        var normalized = UserSearchPolicy.Normalize(query);
        if (normalized.Length < UserSearchPolicy.MinQueryLength)
            return new GlobalSearchResponse();

        var titles = SearchTitlesAsync(normalized, ct);
        var sagas = await SearchSagasAsync(normalized, ct);

        if (currentUserId is null)
        {
            return new GlobalSearchResponse
            {
                Titles = await titles,
                Sagas = sagas,
                PublicLists = await _publicLists.FindAsync(normalized, new HashSet<string>(), ct)
            };
        }

        var members = await _members.HandleAsync(normalized, currentUserId, ct);
        var mine = await _mySpace.FindAsync(normalized, currentUserId, ct);

        return new GlobalSearchResponse
        {
            Titles = await titles,
            Sagas = sagas,
            Members = members.Items.Take(SectionLimit).ToList(),
            Nights = mine.Nights,
            Groups = mine.Groups,
            Lists = mine.Lists,
            PublicLists = await _publicLists.FindAsync(normalized, mine.MyListIds, ct)
        };
    }

    private async Task<IReadOnlyList<GlobalSearchTitleItem>> SearchTitlesAsync(string query, CancellationToken ct)
    {
        if (!_options.HasTmdbCredentials)
            return [];

        IReadOnlyList<TmdbSearchItem> rows;
        try
        {
            rows = await _tmdb.SearchTitlesAsync(query, allowSeries: true, ct: ct);
        }
        catch (HttpRequestException)
        {
            return [];
        }

        return rows
            .Take(TitleLimit)
            .Select(row => new GlobalSearchTitleItem
            {
                TmdbId = row.Id,
                MediaType = row.MediaType,
                Title = row.Title,
                Year = row.Year,
                PosterPath = row.PosterPath
            })
            .ToList();
    }

    private async Task<IReadOnlyList<GlobalSearchSagaItem>> SearchSagasAsync(string query, CancellationToken ct)
    {
        MovieCollectionListResponse catalog;
        try
        {
            catalog = await _sagas.HandleAsync(ct);
        }
        catch (MoviePickerException)
        {
            return [];
        }

        return catalog.Items
            .Where(saga => UserSearchPolicy.Contains(saga.Name, query))
            .Take(SectionLimit)
            .Select(saga => new GlobalSearchSagaItem
            {
                Id = saga.Id,
                Name = saga.Name,
                PosterPath = saga.PosterPath,
                MovieCount = saga.MovieCount
            })
            .ToList();
    }
}
