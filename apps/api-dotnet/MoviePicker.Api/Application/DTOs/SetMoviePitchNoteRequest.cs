using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class SetMoviePitchNoteRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;

    [Required]
    [MinLength(1)]
    [MaxLength(140)]
    public string PitchNote { get; init; } = string.Empty;
}
