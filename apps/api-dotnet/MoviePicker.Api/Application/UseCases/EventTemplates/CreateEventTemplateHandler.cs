using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.EventTemplates;

public sealed class CreateEventTemplateHandler : ICreateEventTemplateHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public CreateEventTemplateHandler(IUserRepository users, TimeProvider clock)
    {
        _users = users;
        _clock = clock;
    }

    public async Task<EventTemplateResponse> HandleAsync(
        string userId,
        SaveEventTemplateRequest request,
        CancellationToken ct = default)
    {
        var user = await EventTemplatePolicy.RequireUserAsync(_users, userId, ct);
        var existing = user.EventTemplates;

        if (existing.Count >= EventTemplate.MaxPerUser)
            throw CapReached();

        var name = EventTemplatePolicy.NormalizeName(request.Name);
        EventTemplatePolicy.EnsureNameIsFree(existing, name, exceptTemplateId: null);

        var now = _clock.GetUtcNow();
        var created = new EventTemplate
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = name,
            Config = EventTemplatePolicy.ToConfig(request),
            CreatedAt = now
        };

        var added = await _users.AddEventTemplateAsync(user.Id, created, EventTemplate.MaxPerUser, now, ct);
        if (!added)
            throw CapReached();

        return EventTemplateResponse.FromTemplate(created);
    }

    private static ConflictException CapReached() => new(
        $"Vous avez atteint la limite de {EventTemplate.MaxPerUser} templates. Supprimez-en un pour en enregistrer un nouveau.");
}
