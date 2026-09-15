using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

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

        var removed = await _users.RemoveEventTemplateAsync(user.Id, templateId, _clock.GetUtcNow(), ct);
        if (!removed)
            throw Errors.EventTemplateNotFound();
    }
}
