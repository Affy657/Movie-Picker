using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class JoinEventRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    public string Pseudo { get; init; } = string.Empty;
}
