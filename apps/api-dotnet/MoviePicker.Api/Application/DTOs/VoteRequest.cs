using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class VoteRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;

    [Required]
    [JsonRequired]
    [AllowedValues(1, -1)]
    public int Value { get; init; }
}
