using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class ReportUsageCountRequest
{
    [Required]
    [MaxLength(64)]
    public string Metric { get; init; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Variant { get; init; } = string.Empty;
}
