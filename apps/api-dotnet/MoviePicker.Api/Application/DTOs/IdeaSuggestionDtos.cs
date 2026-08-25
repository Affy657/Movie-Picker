using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class CreateIdeaSuggestionRequest
{
    [Required]
    public IdeaSuggestionCategory? Category { get; init; }

    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    public string Title { get; init; } = string.Empty;

    [Required]
    [MinLength(1)]
    [MaxLength(2000)]
    public string Description { get; init; } = string.Empty;

    [MaxLength(300)]
    public string? PagePath { get; init; }

    [MaxLength(20)]
    public string? AppVersion { get; init; }
}
