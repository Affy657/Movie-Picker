using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class CreateEventRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "Format date attendu: YYYY-MM-DD")]
    public string Date { get; init; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{2}:\d{2}$", ErrorMessage = "Format heure attendu: HH:mm")]
    public string Time { get; init; } = string.Empty;
}
