using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record LogoutRequest
{
    [MaxLength(2048)]
    public string? PushEndpoint { get; init; }
}
