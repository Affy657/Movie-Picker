using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record PasswordResetVerifyRequest
{
    [MaxLength(1024)]
    public string Token { get; init; } = string.Empty;
}
