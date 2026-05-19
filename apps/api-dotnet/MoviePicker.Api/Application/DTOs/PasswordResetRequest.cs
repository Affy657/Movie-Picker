namespace MoviePicker.Api.Application.DTOs;

public sealed record PasswordResetRequest
{
    public string Email { get; init; } = string.Empty;

    public string? Locale { get; init; }
}
