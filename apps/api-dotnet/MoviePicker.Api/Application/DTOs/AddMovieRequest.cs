using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class AddMovieRequest : TmdbTitleRequest
{
    [MaxLength(20)]
    public IReadOnlyList<int>? GenreIds { get; init; }

    [MaxLength(140)]
    public string? PitchNote { get; init; }

    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;
}
