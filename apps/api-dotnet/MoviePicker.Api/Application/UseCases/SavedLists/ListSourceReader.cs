using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.PublicLists;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed class ListSourceReader
{
    private const string CollectionNameCacheKeyPrefix = "list-source-v1:collection-name:";

    private const int MaxMemberListIdLength = 64;

    private const int CatalogReadParallelism = 4;

    private static readonly Dictionary<string, ListSourceType> SavableTypes =
        ListSourceNames.TypesByName(StringComparer.OrdinalIgnoreCase);

    private readonly IGetMovieShowcaseHandler _showcase;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly IPosterImageStore _posters;
    private readonly SharedCacheReadThrough _cache;
    private readonly MoviePickerOptions _options;
    private readonly PublicListReader _publicLists;
    private readonly MemberProfileListReader _profiles;
    private readonly ISavedListRepository _saved;
    private readonly ILogger<ListSourceReader> _logger;

    public ListSourceReader(
        IGetMovieShowcaseHandler showcase,
        ITmdbMovieSearch tmdb,
        IPosterImageStore posters,
        SharedCacheReadThrough cache,
        IOptions<MoviePickerOptions> options,
        PublicListReader publicLists,
        MemberProfileListReader profiles,
        ISavedListRepository saved,
        ILogger<ListSourceReader> logger)
    {
        _showcase = showcase;
        _tmdb = tmdb;
        _posters = posters;
        _cache = cache;
        _options = options.Value;
        _publicLists = publicLists;
        _profiles = profiles;
        _saved = saved;
        _logger = logger;
    }

    public static ListSource Parse(string? sourceType, string? sourceId)
    {
        if (string.IsNullOrWhiteSpace(sourceType)
            || !SavableTypes.TryGetValue(sourceType.Trim(), out var type)
            || string.IsNullOrWhiteSpace(sourceId))
            throw Errors.ListSourceNotSavable();

        var id = sourceId.Trim();
        return type switch
        {
            ListSourceType.TmdbCollection => new ListSource(type, CanonicalCollectionId(id)),
            ListSourceType.MemberList => new ListSource(type, CanonicalMemberListId(id)),
            _ when MemberProfileListReader.Covers(type) => new ListSource(type, CanonicalHandle(id)),
            _ => new ListSource(type, MovieShowcaseCatalog.ThemeKey(id) ?? id.ToLowerInvariant())
        };
    }

    public static bool FollowsAMember(ListSourceType type) =>
        type == ListSourceType.MemberList || MemberProfileListReader.Covers(type);

    public async Task<SavableListSource> RequireSavableAsync(
        string userId,
        ListSource source,
        CancellationToken ct = default)
    {
        if (source.Type == ListSourceType.MemberList)
        {
            var memberList = await RequireSavableMemberListAsync(userId, source, ct);
            return new SavableListSource(source, memberList, memberList.Creator?.Id);
        }

        if (MemberProfileListReader.Covers(source.Type))
        {
            var (resolved, content) = await _profiles.RequireSavableAsync(userId, source, ct);
            return new SavableListSource(resolved, content, resolved.Id);
        }

        return new SavableListSource(source, null, null);
    }

    public async Task<ListSource?> ResolveAsync(ListSource source, CancellationToken ct = default) =>
        MemberProfileListReader.Covers(source.Type) ? await _profiles.ResolveAsync(source, ct) : source;

    private async Task<ListSourceContent> RequireSavableMemberListAsync(
        string userId,
        ListSource source,
        CancellationToken ct)
    {
        var lookup = await _publicLists.FindAsync(source.Id, ct);
        if (lookup.List?.RoleOf(userId) is not null)
            throw Errors.ListAlreadyYours();
        if (!lookup.IsPublic)
            throw Errors.ListSourceNotFound();
        return ListSourceContent.OfMemberList(lookup.List!, lookup.Creator!);
    }

    public async Task<string> RequireFallbackNameAsync(ListSource source, CancellationToken ct = default)
    {
        if (source.Type == ListSourceType.ExplorerTheme)
            return MovieShowcaseCatalog.ThemeKey(source.Id) ?? throw Errors.ListSourceNotFound();

        if (!_options.HasTmdbCredentials)
            throw Errors.ListSourceUnavailable();

        CollectionNameLookup lookup;
        try
        {
            lookup = await CollectionNameAsync(CollectionId(source), ct);
        }
        catch (Exception ex) when (IsSourceFailure(ex, ct))
        {
            _logger.LogWarning(ex, "Saga {CollectionId} could not be checked before being saved", LogText.SingleLine(source.Id));
            throw Errors.ListSourceUnavailable();
        }

        return lookup.Name ?? throw Errors.ListSourceNotFound();
    }

    public async Task<ListSourceContent> ReadAsync(ListSource source, CancellationToken ct = default)
    {
        if (source.Type == ListSourceType.MemberList)
            return await ReadMemberListAsync(source, ct);
        if (MemberProfileListReader.Covers(source.Type))
            return await _profiles.ReadAsync(source, ct);

        var titlesTask = ReadTitlesAsync(source, ct);
        var nameTask = ReadNameAsync(source, ct);
        try
        {
            await Task.WhenAll(titlesTask, nameTask);
        }
        catch (Exception ex) when (IsSourceFailure(ex, ct))
        {
            _logger.LogWarning(
                ex,
                "List source {SourceType} {SourceId} could not be read",
                source.Type,
                LogText.SingleLine(source.Id));
            return ListSourceContent.Unavailable;
        }

        return ListSourceContent.OfCatalog(await nameTask, await titlesTask);
    }

    public async Task<IReadOnlyList<ListSourceContent>> ReadAllAsync(
        IReadOnlyList<ListSource> sources,
        CancellationToken ct = default)
    {
        var memberListIds = sources
            .Where(source => source.Type == ListSourceType.MemberList)
            .Select(source => source.Id)
            .ToList();
        var memberLists = await _publicLists.FindManyAsync(memberListIds, ct);
        var contents = new ListSourceContent[sources.Count];
        await Parallel.ForEachAsync(
            Enumerable.Range(0, sources.Count),
            new ParallelOptions { MaxDegreeOfParallelism = CatalogReadParallelism, CancellationToken = ct },
            async (index, token) => contents[index] = sources[index].Type == ListSourceType.MemberList
                ? ContentOf(memberLists[sources[index].Id])
                : await ReadAsync(sources[index], token));
        return contents;
    }

    public async Task<ListSourceContent> ReadAndKeepWhatIsSeenAsync(SavedList saved, CancellationToken ct = default)
    {
        var content = await ReadAsync(saved.Source, ct);
        if (FollowsAMember(saved.SourceType) && content.IsAvailable)
            await RefreshSnapshotAsync(saved, content, ct);
        return content;
    }

    private async Task<ListSourceContent> ReadMemberListAsync(ListSource source, CancellationToken ct) =>
        ContentOf(await _publicLists.FindAsync(source.Id, ct));

    private static ListSourceContent ContentOf(PublicListLookup lookup) =>
        lookup.IsPublic
            ? ListSourceContent.OfMemberList(lookup.List!, lookup.Creator!)
            : ListSourceContent.Withdrawn(lookup.UnavailableReason!.Value);

    private async Task RefreshSnapshotAsync(SavedList saved, ListSourceContent content, CancellationToken ct)
    {
        var name = content.Name ?? saved.Name;
        var snapshot = content.Titles;
        var unchanged = name == saved.Name
            && snapshot.Count == saved.Snapshot.Count
            && snapshot.Zip(saved.Snapshot).All(pair => pair.First.SameFactsAs(pair.Second));
        if (!unchanged)
            await _saved.RefreshSnapshotAsync(saved.OwnerId, saved.Id, saved.SourceOwnerId, name, snapshot, ct);
    }

    private async Task<IReadOnlyList<SavedListTitle>> ReadTitlesAsync(ListSource source, CancellationToken ct)
    {
        var query = source.Type == ListSourceType.TmdbCollection
            ? new MovieShowcaseQuery(MovieShowcaseSections.Collection, CollectionId: CollectionId(source))
            : new MovieShowcaseQuery(MovieShowcaseSections.Theme, Theme: source.Id);
        var section = await _showcase.HandleAsync(query, ct);
        return [.. section.Items.Select(ToTitle)];
    }

    private async Task<string?> ReadNameAsync(ListSource source, CancellationToken ct)
    {
        if (source.Type != ListSourceType.TmdbCollection || !_options.HasTmdbCredentials)
            return null;

        try
        {
            return (await CollectionNameAsync(CollectionId(source), ct)).Name;
        }
        catch (Exception ex) when (IsSourceFailure(ex, ct))
        {
            _logger.LogWarning(ex, "Name of the saga {CollectionId} could not be read", LogText.SingleLine(source.Id));
            return null;
        }
    }

    private Task<CollectionNameLookup> CollectionNameAsync(int collectionId, CancellationToken ct) =>
        _cache.GetOrLoadAsync(
            CollectionNameCacheKeyPrefix + collectionId.ToString(CultureInfo.InvariantCulture),
            TimeSpan.FromHours(Math.Clamp(_options.MovieShowcaseCacheHours, 1, 168)),
            async token => new CollectionNameLookup((await _tmdb.GetCollectionAsync(collectionId, CatalogLanguage.French, token))?.Name),
            shareAcrossInstances: false,
            ct);

    private SavedListTitle ToTitle(MovieShowcaseItemResponse item) => new()
    {
        TmdbId = item.Id,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = _posters.ToPublicPosterPath(item.PosterPath),
        VoteAverage = item.VoteAverage,
        RuntimeMinutes = item.RuntimeMinutes,
        GenreIds = item.GenreIds
    };

    private static string CanonicalCollectionId(string raw) =>
        int.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out var id)
        && id is > 0 and <= MovieShowcaseCatalog.MaxSeedTmdbId
            ? id.ToString(CultureInfo.InvariantCulture)
            : throw Errors.ListSourceNotSavable();

    private static string CanonicalMemberListId(string raw) =>
        raw.Length <= MaxMemberListIdLength && raw.All(char.IsAsciiLetterOrDigit)
            ? raw.ToLowerInvariant()
            : throw Errors.ListSourceNotSavable();

    private static string CanonicalHandle(string raw) =>
        HandlePolicy.Validate(raw) is null ? HandlePolicy.Normalize(raw) : throw Errors.ListSourceNotSavable();

    private static int CollectionId(ListSource source) => int.Parse(source.Id, CultureInfo.InvariantCulture);

    private static bool IsSourceFailure(Exception ex, CancellationToken ct) =>
        ex is MoviePickerException
            or HttpRequestException
            or JsonException
            or TimeoutException
        || (ex is TaskCanceledException && !ct.IsCancellationRequested);

    private sealed record CollectionNameLookup(string? Name);
}

public sealed record SavableListSource(ListSource Source, ListSourceContent? Content, string? SourceOwnerId);
