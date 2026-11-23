using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public sealed class VerifyPasswordResetHandler : IVerifyPasswordResetHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordResetTokenRepository _tokens;

    public VerifyPasswordResetHandler(IUserRepository users, IPasswordResetTokenRepository tokens)
    {
        _users = users;
        _tokens = tokens;
    }

    public async Task HandleAsync(PasswordResetVerifyRequest request, CancellationToken ct = default)
    {
        var token = (request.Token ?? "").Trim();
        if (string.IsNullOrEmpty(token))
            throw Errors.InvalidResetToken();

        var stored = await _tokens.GetByTokenHashAsync(PasswordResetTokenFactory.Hash(token), ct)
            ?? throw Errors.InvalidResetToken();

        if (await _users.GetByIdAsync(stored.UserId, ct) is null)
            throw Errors.InvalidResetToken();
    }
}
