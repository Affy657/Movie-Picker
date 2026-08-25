namespace MoviePicker.Api.Application.DTOs;

public sealed record CsrfGuardRequest
{
    public bool? Guard { get; init; }
}
