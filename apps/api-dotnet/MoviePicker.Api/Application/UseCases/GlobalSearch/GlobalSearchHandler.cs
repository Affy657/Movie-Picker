using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.GlobalSearch;

public sealed class GlobalSearchHandler : IGlobalSearchHandler
{
    public const int TitleLimit = 5;
    public const int SectionLimit = 4;

    private readonly ITmdbMovieSearch _tmdb;
    private readonly ISearchUsersHandler _members;
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IFriendGroupRepository _groups;
    private readonly MoviePickerOptions _options;
    private readonly TimeProvider _clock;

    public GlobalSearchHandler(
        ITmdbMovieSearch tmdb,
        ISearchUsersHandler members,
        IEventRepository events,
        IParticipantRepository participants,
        IFriendGroupRepository groups,
        IOptions<MoviePickerOptions> options,
        TimeProvider clock)
    {
        _tmdb = tmdb;
        _members = members;
        _events = events;
        _participants = participants;
        _groups = groups;
        _options = options.Value;
        _clock = clock;
    }

    public async Task<GlobalSearchResponse> HandleAsync(string? query, string? currentUserId, CancellationToken ct = default)
    {
        var normalized = UserSearchPolicy.Normalize(query);
        if (normalized.Length < UserSearchPolicy.MinQueryLength)
            return new GlobalSearchResponse();

        var titles = SearchTitlesAsync(normalized, ct);
        if (currentUserId is null)
            return new GlobalSearchResponse { Titles = await titles };

        var members = await _members.HandleAsync(normalized, currentUserId, ct);
        var nights = await SearchNightsAsync(normalized, currentUserId, ct);

        return new GlobalSearchResponse
        {
            Titles = await titles,
            Members = members.Items.Take(SectionLimit).ToList(),
            Nights = nights
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

    private async Task<IReadOnlyList<GlobalSearchNightItem>> SearchNightsAsync(string query, string userId, CancellationToken ct)
    {
        var utcNow = _clock.GetUtcNow();
        var created = await _events.ListAllByCreatorUserIdAsync(userId, ct);
        var joined = await ListOnlyJoinedAsync(userId, created, ct);
        var groupNights = await ListOpenGroupNightsAsync(userId, utcNow, ct);

        return created
            .Concat(joined)
            .Concat(groupNights)
            .DistinctBy(night => night.Id)
            .Where(night => UserSearchPolicy.Contains(night.Title, query))
            .Select(night => (Night: night, IsFinished: night.IsFinished(utcNow), StartTicks: StartOf(night).UtcTicks))
            .OrderBy(entry => entry.IsFinished)
            .ThenBy(entry => entry.IsFinished ? -entry.StartTicks : entry.StartTicks)
            .Take(SectionLimit)
            .Select(entry => new GlobalSearchNightItem
            {
                Slug = entry.Night.Slug,
                Title = entry.Night.Title,
                Date = entry.Night.Date,
                Time = entry.Night.Time,
                IsFinished = entry.IsFinished
            })
            .ToList();
    }

    private async Task<IReadOnlyList<Event>> ListOnlyJoinedAsync(string userId, IReadOnlyList<Event> created, CancellationToken ct)
    {
        var createdIds = created.Select(night => night.Id).ToHashSet(StringComparer.Ordinal);
        var joinedIds = (await _participants.ListDistinctEventIdsByUserIdAsync(userId, ct))
            .Where(id => !createdIds.Contains(id))
            .ToList();
        return joinedIds.Count == 0 ? [] : await _events.ListByIdsAsync(joinedIds, ct);
    }

    private async Task<IEnumerable<Event>> ListOpenGroupNightsAsync(string userId, DateTimeOffset utcNow, CancellationToken ct)
    {
        var groups = await _groups.ListAdmittingAsync(userId, ct);
        if (groups.Count == 0)
            return [];

        var nights = await _events.ListByGroupIdsAsync(groups.Select(group => group.Id).ToList(), ct);
        return FriendGroup.NightsKeptBy(nights, groups).Where(night => !night.IsFinished(utcNow));
    }

    private static DateTimeOffset StartOf(Event night) =>
        EventSchedule.TryGetStartUtc(night.Date, night.Time, out var start) ? start : night.CreatedAt;
}
