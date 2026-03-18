using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class VoteRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;

    [Required]
    [AllowedValues(1, -1)]
    public int Value { get; init; }
}
