using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Services;

namespace MoviePicker.Api.Application.UseCases.CreateEvent;

public sealed class CreateEventHandler : ICreateEventHandler
{
    private readonly IEventRepository _eventRepository;

    public CreateEventHandler(IEventRepository eventRepository)
    {
        _eventRepository = eventRepository;
    }

    public async Task<CreateEventResponse> HandleAsync(CreateEventRequest request, string? creatorUserId, CancellationToken ct = default)
    {
        var slug = SlugGenerator.NewSlug();
        var hostToken = SlugGenerator.NewHostToken();
        var now = DateTimeOffset.UtcNow;
        var ownerId = string.IsNullOrWhiteSpace(creatorUserId) ? null : creatorUserId;

        var evt = new Event
        {
            Id = string.Empty,
            Title = request.Title.Trim(),
            Date = request.Date,
            Time = request.Time,
            HostToken = hostToken,
            Slug = slug,
            CreatorUserId = ownerId,
            Config = null,
            ClosedAt = null,
            WinnerMovieId = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _eventRepository.AddAsync(evt, ct);

        return new CreateEventResponse
        {
            Id = created.Id,
            Title = created.Title,
            Date = created.Date,
            Time = created.Time,
            Slug = created.Slug,
            HostToken = created.HostToken,
            ShareUrl = $"/s/{created.Slug}",
            CreatedAt = created.CreatedAt,
            UpdatedAt = created.UpdatedAt
        };
    }
}
