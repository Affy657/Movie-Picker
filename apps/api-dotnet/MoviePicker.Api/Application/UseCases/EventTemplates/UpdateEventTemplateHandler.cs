using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.EventTemplates;

public sealed class UpdateEventTemplateHandler : IUpdateEventTemplateHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public UpdateEventTemplateHandler(IUserRepository users, TimeProvider clock)
    {
        _users = users;
        _clock = clock;
    }

    public async Task<EventTemplateResponse> HandleAsync(
        string userId,
        string templateId,
        SaveEventTemplateRequest request,
        CancellationToken ct = default)
    {
        var user = await EventTemplatePolicy.RequireUserAsync(_users, userId, ct);
        var existing = user.EventTemplates;
        var index = EventTemplatePolicy.RequireIndexOf(existing, templateId);

        var name = EventTemplatePolicy.NormalizeName(request.Name);
        EventTemplatePolicy.EnsureNameIsFree(existing, name, exceptTemplateId: templateId);

        var updated = existing[index] with
        {
            Name = name,
            Config = EventTemplatePolicy.ToConfig(request)
        };

        var next = existing.ToList();
        next[index] = updated;

        await _users.UpdateAsync(
            user with { EventTemplates = next, UpdatedAt = _clock.GetUtcNow() },
            ct);

        return EventTemplateResponse.FromTemplate(updated);
    }
}
