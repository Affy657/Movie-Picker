using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.EventTemplates;

public sealed class DeleteEventTemplateHandler : IDeleteEventTemplateHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public DeleteEventTemplateHandler(IUserRepository users, TimeProvider clock)
    {
        _users = users;
        _clock = clock;
    }

    public async Task HandleAsync(string userId, string templateId, CancellationToken ct = default)
    {
        var user = await EventTemplatePolicy.RequireUserAsync(_users, userId, ct);
        var index = EventTemplatePolicy.RequireIndexOf(user.EventTemplates, templateId);

        var next = user.EventTemplates.ToList();
        next.RemoveAt(index);

        await _users.UpdateAsync(
            user with { EventTemplates = next, UpdatedAt = _clock.GetUtcNow() },
            ct);
    }
}
