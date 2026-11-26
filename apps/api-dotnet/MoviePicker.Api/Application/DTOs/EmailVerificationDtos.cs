using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record EmailVerificationRequest
{
    [MaxLength(16)]
    public string? Locale { get; init; }
}

public sealed record EmailVerificationConfirmRequest
{
    [MaxLength(1024)]
    public string Token { get; init; } = string.Empty;
}
