using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public sealed class DisableTwoFactorHandler : IDisableTwoFactorHandler
{
    private readonly IUserRepository _users;
    private readonly TwoFactorCodeCheck _codeCheck;
    private readonly TimeProvider _clock;
    private readonly ILogger<DisableTwoFactorHandler> _logger;

    public DisableTwoFactorHandler(
        IUserRepository users,
        TwoFactorCodeCheck codeCheck,
        TimeProvider clock,
        ILogger<DisableTwoFactorHandler> logger)
    {
        _users = users;
        _codeCheck = codeCheck;
        _clock = clock;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, TwoFactorCodeRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        await _codeCheck.RequireAsync(user, request.Code, ct);
        await _users.UpdateAsync(user with { TwoFactor = null, UpdatedAt = _clock.GetUtcNow() }, ct);
        _logger.LogInformation("Two-factor authentication disabled for {UserId}", LogText.SingleLine(user.Id));
    }
}
