using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Follow;

public sealed class UnfollowUserHandler : IUnfollowUserHandler
{
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;

    public UnfollowUserHandler(IFollowRepository follows, IUserRepository users)
    {
        _follows = follows;
        _users = users;
    }

    public async Task HandleAsync(string currentUserId, string targetHandle, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(targetHandle);
        var target = await _users.GetByHandleAsync(normalized, ct)
            ?? throw new NotFoundException("Profil introuvable");

        await _follows.UnfollowAsync(currentUserId, target.Id, ct);
    }
}
