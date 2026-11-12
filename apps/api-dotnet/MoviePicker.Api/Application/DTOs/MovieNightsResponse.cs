namespace MoviePicker.Api.Application.DTOs;

public sealed class MovieNightsResponse
{
    public IReadOnlyList<MovieNightResponse> Nights { get; init; } = Array.Empty<MovieNightResponse>();
    public int ProposalCount { get; init; }
    public int WinCount { get; init; }
    public MovieNightsRatingResponse? Rating { get; init; }
    public IReadOnlyList<MovieNightViewerResponse> SeenBy { get; init; } = Array.Empty<MovieNightViewerResponse>();
    public int SeenCount { get; init; }
}

public sealed class MovieNightResponse
{
    public string Slug { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Date { get; init; }
    public bool IsWinner { get; init; }
    public bool IsFinished { get; init; }
    public string? RecapSlug { get; init; }
    public string ProposerPseudo { get; init; } = string.Empty;
}

public sealed class MovieNightsRatingResponse
{
    public double Average { get; init; }
    public int Count { get; init; }
}

public sealed class MovieNightViewerResponse
{
    public string Pseudo { get; init; } = string.Empty;
    public string? AvatarId { get; init; }
}
