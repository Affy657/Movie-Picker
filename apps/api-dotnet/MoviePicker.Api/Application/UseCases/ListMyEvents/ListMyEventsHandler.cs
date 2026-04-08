using System.Linq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public sealed class ListMyEventsHandler : IListMyEventsHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;

    public ListMyEventsHandler(IEventRepository eventRepository, IParticipantRepository participantRepository)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
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

        var ordered = merged.Values
            .OrderByDescending(x => x.UpdatedAt)
            .Take(lim)
            .ToList();

        return new MyEventsListResponse { Events = ordered };
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
        Lifecycle = MyEventListLifecycle.Compute(e, DateTimeOffset.UtcNow)
    };
}
