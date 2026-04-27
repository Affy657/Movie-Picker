using System.Linq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public sealed class ListMyEventsHandler : IListMyEventsHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRepository _movieRepository;

    public ListMyEventsHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
    }

    public async Task<MyEventsListResponse> HandleAsync(string userId, int? limit, CancellationToken ct = default)
    {
        var lim = limit is null ? 50 : Math.Clamp(limit.Value, 1, 100);

        var created = await _eventRepository.ListByCreatorUserIdAsync(userId, 200, ct);
        var joinedIds = await _participantRepository.ListDistinctEventIdsByUserIdAsync(userId, ct);
        var joinedSet = new HashSet<string>(joinedIds);
        var createdIds = new HashSet<string>(created.Select(e => e.Id));

        var merged = new Dictionary<string, MyEventSummaryDto>();

        foreach (var e in created)
        {
            merged[e.Id] = ToDto(e, isCreator: true, isParticipant: joinedSet.Contains(e.Id));
        }

        var onlyJoined = joinedIds.Where(id => !createdIds.Contains(id)).ToList();
        if (onlyJoined.Count > 0)
        {
            var extra = await _eventRepository.ListByIdsAsync(onlyJoined, ct);
            foreach (var e in extra)
            {
                if (!merged.ContainsKey(e.Id))
                    merged[e.Id] = ToDto(e, isCreator: false, isParticipant: true);
            }
        }

        var orderedSlice = merged.Values
            .OrderByDescending(x => x.UpdatedAt)
            .Take(lim)
            .ToList();

        if (orderedSlice.Count == 0)
            return new MyEventsListResponse { Events = orderedSlice };

        var sliceIds = orderedSlice.ConvertAll(x => x.Id);
        var participantCountsTask = _participantRepository.CountByEventIdsAsync(sliceIds, ct);
        var movieCountsTask = _movieRepository.CountByEventIdsAsync(sliceIds, ct);
        await Task.WhenAll(participantCountsTask, movieCountsTask);
        var participantCounts = await participantCountsTask;
        var movieCounts = await movieCountsTask;

        var enriched = orderedSlice.ConvertAll(d =>
        {
            var id = d.Id;
            return new MyEventSummaryDto
            {
                Id = d.Id,
                Slug = d.Slug,
                Title = d.Title,
                Date = d.Date,
                Time = d.Time,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
                IsCreator = d.IsCreator,
                IsParticipant = d.IsParticipant,
                Lifecycle = d.Lifecycle,
                ParticipantCount = participantCounts.TryGetValue(id, out var pc) ? pc : 0,
                MovieCount = movieCounts.TryGetValue(id, out var mc) ? mc : 0,
                MaxParticipants = d.MaxParticipants,
            };
        });

        return new MyEventsListResponse { Events = enriched };
    }

    private static MyEventSummaryDto ToDto(Event e, bool isCreator, bool isParticipant) => new()
    {
        Id = e.Id,
        Slug = e.Slug,
        Title = e.Title,
        Date = e.Date,
        Time = e.Time,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        IsCreator = isCreator,
        IsParticipant = isParticipant,
        Lifecycle = MyEventListLifecycle.Compute(e, DateTimeOffset.UtcNow),
        ParticipantCount = 0,
        MovieCount = 0,
        MaxParticipants = e.Config?.MaxParticipants,
    };
}
