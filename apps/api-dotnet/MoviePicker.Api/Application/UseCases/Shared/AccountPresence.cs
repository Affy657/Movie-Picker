using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class AccountPresence
{
    public static async Task RequireAccountAsync(this IUserRepository users, string userId, CancellationToken ct)
    {
        if (await users.GetByIdAsync(userId, ct) is null)
            throw Errors.UserNotFound();
    }
}
