using System.Text.Json;
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

    public async Task<GlobalSearchResponse> HandleAsync(
        string? query,
        string? currentUserId,
        CatalogLanguage language,
        CancellationToken ct = default)
    {
        var normalized = UserSearchPolicy.Normalize(query);
        if (normalized.Length < UserSearchPolicy.MinQueryLength)
            return new GlobalSearchResponse();

        var titles = SearchTitlesAsync(normalized, language, ct);
        var sagas = SearchSagasAsync(normalized, language, ct);
        var publicLists = _publicLists.FindAsync(normalized, currentUserId, ct);

        if (currentUserId is null)
        {
            await Task.WhenAll(titles, sagas, publicLists);
            return new GlobalSearchResponse
            {
                Titles = await titles,
                Sagas = await sagas,
                PublicLists = (await publicLists).Take(SectionLimit).ToList()
            };
        }

        var members = _members.HandleAsync(normalized, null, ct);
        var mine = _mySpace.FindAsync(normalized, currentUserId, ct);
        await Task.WhenAll(titles, sagas, publicLists, members, mine);

        var myMatches = await mine;
        var listedAsMine = myMatches.Lists.Select(list => list.Id).ToHashSet(StringComparer.Ordinal);
        return new GlobalSearchResponse
        {
            Titles = await titles,
            Sagas = await sagas,
            Members = (await members).Items.Take(SectionLimit).ToList(),
            Nights = myMatches.Nights,
            Groups = myMatches.Groups,
            Lists = myMatches.Lists,
            PublicLists = (await publicLists).Where(list => !listedAsMine.Contains(list.Id)).Take(SectionLimit).ToList()
        };
    }

    private async Task<IReadOnlyList<GlobalSearchTitleItem>> SearchTitlesAsync(
        string query,
        CatalogLanguage language,
        CancellationToken ct)
    {
        if (!_options.HasTmdbCredentials)
            return [];

        IReadOnlyList<TmdbSearchItem> rows;
        try
        {
            rows = await _tmdb.SearchTitlesAsync(query, allowSeries: true, language, ct: ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException)
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

    private async Task<IReadOnlyList<GlobalSearchSagaItem>> SearchSagasAsync(
        string query,
        CatalogLanguage language,
        CancellationToken ct)
    {
        MovieCollectionListResponse catalog;
        try
        {
            catalog = await _sagas.HandleAsync(language, ct);
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
