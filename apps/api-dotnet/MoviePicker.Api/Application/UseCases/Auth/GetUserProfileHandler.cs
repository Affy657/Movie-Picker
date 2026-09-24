using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class GetUserProfileHandler : IGetUserProfileHandler
{
    private readonly IUserRepository _users;

    public GetUserProfileHandler(IUserRepository users) => _users = users;

    public async Task<UserProfileResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        return UserProfileResponses.From(user);
    }
}
