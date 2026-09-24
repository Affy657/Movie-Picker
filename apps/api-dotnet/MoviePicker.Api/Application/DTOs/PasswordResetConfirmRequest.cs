using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record PasswordResetConfirmRequest
{
    public string Token { get; init; } = string.Empty;

    [MaxLength(1024)]
    public string NewPassword { get; init; } = string.Empty;
}
