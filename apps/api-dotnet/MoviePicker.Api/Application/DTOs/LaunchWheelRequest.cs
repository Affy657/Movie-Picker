using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record LaunchWheelRequest
{
    [Range(0, 100)]
    public int? ExpectedWinnerCount { get; init; }
}
