using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class DeleteMovieRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;
}
