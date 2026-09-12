using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Tests.Builders;

public static class TestWinners
{
    private static readonly DateTimeOffset FirstPick = new(2030, 6, 1, 20, 0, 0, TimeSpan.Zero);

    public static IReadOnlyList<EventWinner> Won(params string?[] movieIds) =>
        movieIds
            .Where(id => !string.IsNullOrEmpty(id))
            .Select((id, index) => Pick(id!, WinnerPickMethod.Wheel, FirstPick.AddMinutes(index)))
            .ToList();

    public static EventWinner Pick(string movieId, WinnerPickMethod method, DateTimeOffset pickedAt) => new()
    {
        MovieId = movieId,
        Method = method,
        PickedAt = pickedAt
    };
}
