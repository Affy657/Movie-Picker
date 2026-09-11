using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

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

        var replaced = await _users.ReplaceEventTemplateAsync(user.Id, updated, _clock.GetUtcNow(), ct);
        if (!replaced)
            throw new NotFoundException(EventTemplatePolicy.NotFoundMessage);

        return EventTemplateResponse.FromTemplate(updated);
    }
}
