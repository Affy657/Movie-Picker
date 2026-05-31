using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Profile;

public sealed class GetPublicProfileHandler : IGetPublicProfileHandler
{
    private readonly IUserRepository _users;

    public GetPublicProfileHandler(IUserRepository users) => _users = users;

    public async Task<PublicProfileResponse> HandleAsync(string handle, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var user = await _users.GetByHandleAsync(normalized, ct);

        // 404 (not 403) for both "unknown" and "private" so we never reveal a private account exists.
        if (user is null || !user.IsProfilePublic)
            throw new NotFoundException("Profil introuvable");

        return new PublicProfileResponse
        {
            Handle = user.Handle,
            DisplayName = user.DisplayName,
            AvatarId = user.AvatarId,
            Bio = user.Bio,
            MemberSince = user.CreatedAt
        };
    }
}
