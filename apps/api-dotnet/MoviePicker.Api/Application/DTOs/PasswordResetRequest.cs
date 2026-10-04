using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record PasswordResetRequest
{
    [MaxLength(254)]
    public string Email { get; init; } = string.Empty;

    public string? Locale { get; init; }
}
