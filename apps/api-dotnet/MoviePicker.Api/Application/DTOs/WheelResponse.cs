namespace MoviePicker.Api.Application.DTOs;

public sealed class WheelResponse
{
    public WinnerMovieResponse Winner { get; init; } = null!;
    public string Message { get; init; } = string.Empty;
}
