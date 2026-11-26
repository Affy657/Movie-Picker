using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class GroupNightTallyTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly DateTimeOffset Now = new(2026, 9, 15, 12, 0, 0, TimeSpan.Zero);

    private readonly MoviePickerApplicationFactory _factory;

    public GroupNightTallyTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private static string NewId() => ObjectId.GenerateNewId().ToString();

    private static EventWinner Won(string movieId) => new() { MovieId = movieId, Method = WinnerPickMethod.Wheel, PickedAt = Now };

    private static Event Night(string groupId, string title, string date, string time, params string[] winnerMovieIds) => new()
    {
        Id = string.Empty,
        Title = title,
        Date = date,
        Time = time,
        GroupId = groupId,
        Winners = winnerMovieIds.Select(Won).ToList(),
        HostToken = Guid.NewGuid().ToString("N"),
        Slug = "tally-" + Guid.NewGuid().ToString("N")[..10],
        CreatedAt = Now,
        UpdatedAt = Now
    };

    private static MovieRating Rating(Event night, string movieId, int value) => new()
    {
        EventId = night.Id,
        MovieId = movieId,
        ParticipantId = NewId(),
        Value = value,
        CreatedAt = Now,
        UpdatedAt = Now
    };

    private static DayOfWeek DayOf(string date) =>
        DateOnly.ParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture).DayOfWeek;

    private sealed record GroupHistory(
        string GroupId,
        Event Ended,
        Event Closed,
        Event ClosedEarlier,
        Event WeekBefore,
        Event AutoClosed,
        IReadOnlyList<string> RatedWinners);

    private static async Task<GroupHistory> SeedAsync(IEventRepository events, IMovieRatingRepository ratings)
    {
        var groupId = NewId();
        var (a, b, c, d, e, f) = (NewId(), NewId(), NewId(), NewId(), NewId(), NewId());
        var closed = await events.AddAsync(Night(groupId, "closed", "2026-09-10", "20:30", a, b) with { ClosedAt = Now });
        var closedEarlier = await events.AddAsync(Night(groupId, "closed earlier", "2026-09-10", "18:00", c) with { ClosedAt = Now });
        var weekBefore = await events.AddAsync(Night(groupId, "week before", "2026-09-03", "20:30", d) with { ClosedAt = Now });
        var autoClosed = await events.AddAsync(Night(groupId, "auto closed", "2026-08-01", "20:30", e));
        var ended = await events.AddAsync(Night(groupId, "ended", "2026-09-15", "11:00", f));
        var liveWinner = NewId();
        var live = await events.AddAsync(Night(groupId, "live", "2026-09-15", "13:00", liveWinner));
        await events.AddAsync(Night(groupId, "closed without film", "2026-09-09", "20:30") with { ClosedAt = Now });
        await events.AddAsync(Night(groupId, "one draw left", "2026-09-15", "11:00", NewId()) with { Config = new EventConfig { WinnerCount = 2 } });

        await ratings.UpsertAsync(Rating(closed, a, 8));
        await ratings.UpsertAsync(Rating(closed, a, 6));
        await ratings.UpsertAsync(Rating(closed, b, 9));
        await ratings.UpsertAsync(Rating(ended, f, 4));
        await ratings.UpsertAsync(Rating(closed, NewId(), 10));
        await ratings.UpsertAsync(Rating(live, liveWinner, 1));

        return new GroupHistory(groupId, ended, closed, closedEarlier, weekBefore, autoClosed, [a, b, f]);
    }

    [Fact]
    public async Task Tally_SumsUpTheNightsEachGroupHeld_WithoutListingThem()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var ratings = scope.ServiceProvider.GetRequiredService<IMovieRatingRepository>();
        var history = await SeedAsync(events, ratings);
        var otherGroupId = NewId();
        var otherWinner = NewId();
        await events.AddAsync(Night(otherGroupId, "other group", "2026-09-01", "21:00", otherWinner) with { ClosedAt = Now });
        var quietGroupId = NewId();
        await events.AddAsync(Night(quietGroupId, "quiet group", "2026-09-20", "21:00"));

        var tallies = await events.TallyHeldByGroupIdsAsync([history.GroupId, otherGroupId, quietGroupId], Now);

        Assert.Equal(
            new[] { history.GroupId, otherGroupId }.Order(StringComparer.Ordinal),
            tallies.Select(tally => tally.GroupId).Order(StringComparer.Ordinal));
        var tally = tallies.Single(found => found.GroupId == history.GroupId);
        Assert.Equal(5, tally.NightCount);
        Assert.Equal(6, tally.FilmCount);
        Assert.Equal("2026-08-01", tally.FirstNightDate);
        Assert.NotNull(tally.AverageFilmRating);
        Assert.Equal((7d + 9d + 4d) / 3d, tally.AverageFilmRating.Value, 9);
        Assert.Equal(3, tally.NightsByWeekday[DayOf("2026-09-10")]);
        Assert.Equal(1, tally.NightsByWeekday[DayOf("2026-08-01")]);
        Assert.Equal(1, tally.NightsByWeekday[DayOf("2026-09-15")]);
        Assert.Equal(5, tally.NightsByWeekday.Values.Sum());
        Assert.Equal(history.Ended.Id, tally.LastNight.Id);
        Assert.Equal(history.GroupId, tally.LastNight.GroupId);
        Assert.Equal(("2026-09-15", "11:00"), (tally.LastNight.Date, tally.LastNight.Time));
        Assert.Equal(history.Ended.GetWinnerMovieIds(), tally.LastNight.WinnerMovieIds);

        var other = tallies.Single(found => found.GroupId == otherGroupId);
        Assert.Equal((1, 1, "2026-09-01"), (other.NightCount, other.FilmCount, other.FirstNightDate));
        Assert.Null(other.AverageFilmRating);
        Assert.Equal([otherWinner], other.LastNight.WinnerMovieIds);

        Assert.Empty(await events.TallyHeldByGroupIdsAsync([], Now));
        Assert.Empty(await events.TallyHeldByGroupIdsAsync(["not-an-object-id"], Now));
    }

    [Fact]
    public async Task LatestHeldNights_AreTheFinishedOnesWithAFilm_LatestFirst_UpToTheLimit()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var ratings = scope.ServiceProvider.GetRequiredService<IMovieRatingRepository>();
        var history = await SeedAsync(events, ratings);
        await events.AddAsync(Night(NewId(), "other group", "2026-09-14", "21:00", NewId()) with { ClosedAt = Now });

        var latest = await events.ListLatestHeldByGroupIdAsync(history.GroupId, Now, 10);
        var firstTwo = await events.ListLatestHeldByGroupIdAsync(history.GroupId, Now, 2);

        Assert.Equal(
            [history.Ended.Id, history.Closed.Id, history.ClosedEarlier.Id, history.WeekBefore.Id, history.AutoClosed.Id],
            latest.Select(night => night.Id));
        Assert.Equal("closed", latest[1].Title);
        Assert.Equal(history.Closed.GetWinnerMovieIds(), latest[1].GetWinnerMovieIds());
        Assert.Equal([history.Ended.Id, history.Closed.Id], firstTwo.Select(night => night.Id));
        Assert.Empty(await events.ListLatestHeldByGroupIdAsync(history.GroupId, Now, 0));
        Assert.Empty(await events.ListLatestHeldByGroupIdAsync("not-an-object-id", Now, 10));
    }
}
