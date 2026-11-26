using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class MyNightMoviesResponse
{
    public IReadOnlyList<MyNightMovieItem> Items { get; init; } = [];
}

public sealed class MyNightMovieItem : ProposedMovieItem
{
    [JsonPropertyOrder(1)]
    public bool ProposedByMe { get; init; }

    [JsonPropertyOrder(2)]
    public bool IsWinner { get; init; }

    [JsonPropertyOrder(3)]
    public bool IsWatched { get; init; }

    [JsonPropertyOrder(4)]
    public NightMovieProposerResponse? LastProposer { get; init; }
}

public sealed class NightMovieProposerResponse
{
    public string Pseudo { get; init; } = string.Empty;
    public string? AvatarId { get; init; }
    public bool IsMe { get; init; }
}
