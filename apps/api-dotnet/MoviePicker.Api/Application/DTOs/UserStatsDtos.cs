namespace MoviePicker.Api.Application.DTOs;

public sealed class UserStatsResponse
{
    public int EventsCreated { get; init; }
    public int EventsJoined { get; init; }
    public int MoviesProposed { get; init; }
    public int VotesCast { get; init; }
    public int WinningProposals { get; init; }
    public int MoviesSeen { get; init; }
    public IReadOnlyList<GenreCount> FavoriteGenres { get; init; } = [];
    public IReadOnlyList<MonthlyActivityPoint> MonthlyActivity { get; init; } = [];
}

public sealed class GenreCount
{
    public int GenreId { get; init; }
    public int Count { get; init; }
}

public sealed class MonthlyActivityPoint
{
    public string Month { get; init; } = string.Empty;
    public int Count { get; init; }
}
