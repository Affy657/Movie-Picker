using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.EventTemplates;

public sealed class ListEventTemplatesHandler : IListEventTemplatesHandler
{
    private readonly IUserRepository _users;

    public ListEventTemplatesHandler(IUserRepository users)
    {
        _users = users;
    }

    public async Task<EventTemplateListResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var user = await EventTemplatePolicy.RequireUserAsync(_users, userId, ct);

        return new EventTemplateListResponse
        {
            Items = [.. user.EventTemplates.Select(EventTemplateResponse.FromTemplate)]
        };
    }
}
