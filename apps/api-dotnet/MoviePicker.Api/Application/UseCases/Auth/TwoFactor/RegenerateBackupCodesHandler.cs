using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public sealed class RegenerateBackupCodesHandler : IRegenerateBackupCodesHandler
{
    private readonly IUserRepository _users;
    private readonly TwoFactorCodeCheck _codeCheck;
    private readonly TimeProvider _clock;

    public RegenerateBackupCodesHandler(IUserRepository users, TwoFactorCodeCheck codeCheck, TimeProvider clock)
    {
        _users = users;
        _codeCheck = codeCheck;
        _clock = clock;
    }

    public async Task<TwoFactorBackupCodesResponse> HandleAsync(
        string userId,
        TwoFactorCodeRequest request,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        var proof = await _codeCheck.RequireAsync(user, request.Code, ct);
        var backupCodes = BackupCodes.Generate();
        var settings = proof.Settings with { BackupCodeHashes = backupCodes.Select(BackupCodes.Hash).ToList() };
        await _users.UpdateAsync(user with { TwoFactor = settings, UpdatedAt = _clock.GetUtcNow() }, ct);
        return new TwoFactorBackupCodesResponse { BackupCodes = backupCodes };
    }
}
