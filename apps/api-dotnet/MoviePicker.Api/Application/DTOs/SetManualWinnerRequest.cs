using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class SetManualWinnerRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string MovieId { get; init; } = string.Empty;
}
