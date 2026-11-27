using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class TwoFactorSetupResponse
{
    public string ManualKey { get; init; } = string.Empty;
    public string OtpauthUri { get; init; } = string.Empty;
    public string SetupToken { get; init; } = string.Empty;
}

public sealed class EnableTwoFactorRequest
{
    [Required(ErrorMessage = "Setup token is required")]
    [MaxLength(2048)]
    public string SetupToken { get; init; } = string.Empty;

    [Required(ErrorMessage = "Code is required")]
    [MaxLength(32)]
    public string Code { get; init; } = string.Empty;

    [MaxLength(1024)]
    public string? CurrentPassword { get; init; }
}

public sealed class TwoFactorCodeRequest
{
    [Required(ErrorMessage = "Code is required")]
    [MaxLength(32)]
    public string Code { get; init; } = string.Empty;
}

public sealed class TwoFactorBackupCodesResponse
{
    public IReadOnlyList<string> BackupCodes { get; init; } = Array.Empty<string>();
}

public sealed class TwoFactorLoginResponse
{
    public string UserId { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public bool UsedBackupCode { get; init; }
    public int BackupCodesRemaining { get; init; }
}
