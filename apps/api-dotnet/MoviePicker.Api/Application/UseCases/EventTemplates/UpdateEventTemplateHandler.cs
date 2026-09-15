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
        var template = EventTemplatePolicy.RequireTemplate(user.EventTemplates, templateId);

        var name = EventTemplatePolicy.NormalizeName(request.Name);
        EventTemplatePolicy.EnsureNameIsFree(user.EventTemplates, name, exceptTemplateId: templateId);

        var updated = template with
        {
            Name = name,
            Config = EventTemplatePolicy.ToConfig(request)
        };

        var replaced = await _users.ReplaceEventTemplateAsync(user.Id, updated, _clock.GetUtcNow(), ct);
        if (!replaced)
            throw Errors.EventTemplateNotFound();

        return EventTemplateResponse.FromTemplate(updated);
    }
}
