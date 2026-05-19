namespace MoviePicker.Api.Application.DTOs;

public sealed record PasswordResetConfirmResponse
{
    public string Message { get; init; } = string.Empty;
}
