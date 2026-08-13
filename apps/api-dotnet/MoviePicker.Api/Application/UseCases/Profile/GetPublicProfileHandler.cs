using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Profile;

public sealed class GetPublicProfileHandler : IGetPublicProfileHandler
{
    private readonly IUserRepository _users;
    private readonly IFollowRepository _follows;

    public GetPublicProfileHandler(IUserRepository users, IFollowRepository follows)
    {
        _users = users;
        _follows = follows;
    }

    public async Task<PublicProfileResponse> HandleAsync(
        string handle, string? currentUserId = null, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var user = await _users.GetByHandleAsync(normalized, ct);

        // 404 (not 403) for both "unknown" and "private" so we never reveal a private account exists.
        if (user is null || !user.IsProfilePublic)
            throw new NotFoundException("Profil introuvable");

        var (followingCount, followersCount) = await _follows.GetCountsAsync(user.Id, ct);

        bool? isFollowedByMe = null;
        if (currentUserId is not null && currentUserId != user.Id)
            isFollowedByMe = await _follows.IsFollowingAsync(currentUserId, user.Id, ct);

        return new PublicProfileResponse
        {
            Handle = user.Handle,
            DisplayName = user.DisplayName,
            AvatarId = user.AvatarId,
            Bio = user.Bio,
            MemberSince = user.CreatedAt,
            FollowingCount = followingCount,
            FollowersCount = followersCount,
            IsSupporter = user.SupporterSince is not null,
            IsFollowedByMe = isFollowedByMe
        };
    }
}
