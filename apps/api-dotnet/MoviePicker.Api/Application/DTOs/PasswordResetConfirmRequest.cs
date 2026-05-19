namespace MoviePicker.Api.Application.DTOs;

public sealed record PasswordResetConfirmRequest
{
    public string Token { get; init; } = string.Empty;

    public string NewPassword { get; init; } = string.Empty;
}
