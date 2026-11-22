using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class GroupShowcaseTests : FriendGroupTestBase
{
    private async Task<Event> NightAsync(string groupId, string date, params string[] guests)
    {
        var night = await Kit.Events.AddAsync(new Event
        {
            Title = $"Soirée du {date}",
            Date = date,
            Time = "21:00",
            Slug = $"soiree-{groupId}-{date}",
            HostToken = "host-token",
            CreatorUserId = FriendGroupTestKit.Owner,
            GroupId = groupId,
            CreatedAt = FriendGroupTestKit.Start,
            UpdatedAt = FriendGroupTestKit.Start
        });
        foreach (var userId in guests.Prepend(FriendGroupTestKit.Owner))
            await Kit.Participants.AddAsync(new Participant { EventId = night.Id, Pseudo = userId, UserId = userId });
        return night;
    }

    private async Task<Movie> WonAsync(Event night, string title, int tmdbId)
    {
        var movie = await Kit.Movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = "p",
            TmdbId = tmdbId,
            Title = title,
            Year = "2001",
            CreatedAt = FriendGroupTestKit.Start
        });
        await Kit.Events.UpdateAsync(night with
        {
            Winners = [new EventWinner { MovieId = movie.Id, PickedAt = FriendGroupTestKit.Start }],
            ClosedAt = FriendGroupTestKit.Start
        });
        return movie;
    }

    private Task RateAsync(Movie movie, string participantId, int value) =>
        Kit.Ratings.UpsertAsync(new MovieRating
        {
            EventId = movie.EventId,
            MovieId = movie.Id,
            ParticipantId = participantId,
            Value = value,
            CreatedAt = FriendGroupTestKit.Start,
            UpdatedAt = FriendGroupTestKit.Start
        });

    private void BackdropOf(int tmdbId, string title, string? backdropUrl) =>
        Kit.Tmdb
            .Setup(tmdb => tmdb.GetDetailsAsync(tmdbId, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(tmdbId, title, null, null, null, [], null, [], [], null, BackdropUrl: backdropUrl));

    [Fact]
    public async Task TheGroupPage_SumsUpTheNightsItHeld()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var brume = await WonAsync(await NightAsync(group.Id, "2026-10-22"), "Brume", 11);
        var sable = await WonAsync(await NightAsync(group.Id, "2026-10-29"), "Sable noir", 12);
        await WonAsync(await NightAsync(group.Id, "2026-10-24"), "Orbite basse", 13);
        await NightAsync(group.Id, "2026-10-15");
        await RateAsync(brume, "p1", 8);
        await RateAsync(brume, "p2", 6);
        await RateAsync(sable, "p1", 9);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Equal(3, page.Stats.NightCount);
        Assert.Equal(3, page.Stats.FilmCount);
        Assert.Equal("2026-10-22", page.Stats.FirstNightDate);
        Assert.Equal(8, page.Stats.AverageRating);
        Assert.Equal((int)DayOfWeek.Thursday, page.Stats.UsualWeekday);
    }

    [Fact]
    public async Task TheGroupPage_NamesNoUsualEvening_WhenNoDayStandsOut()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await WonAsync(await NightAsync(group.Id, "2026-10-22"), "Brume", 11);
        await WonAsync(await NightAsync(group.Id, "2026-10-24"), "Orbite basse", 13);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Equal(2, page.Stats.NightCount);
        Assert.Null(page.Stats.UsualWeekday);
        Assert.Null(page.Stats.AverageRating);
    }

    [Fact]
    public async Task TheGroupPage_TakesItsBannerFromTheFilmOfItsLastNight()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await WonAsync(await NightAsync(group.Id, "2026-10-29"), "Brume", 11);
        await WonAsync(await NightAsync(group.Id, "2026-11-05"), "Minuit à Kyoto", 12);
        BackdropOf(11, "Brume", "https://image.tmdb.org/t/p/w780/brume.jpg");
        BackdropOf(12, "Minuit à Kyoto", "https://image.tmdb.org/t/p/w780/kyoto.jpg");

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.NotNull(page.Cover);
        Assert.Equal(12, page.Cover.TmdbId);
        Assert.Equal(MovieMediaType.Movie, page.Cover.MediaType);
        Assert.Equal("Minuit à Kyoto", page.Cover.Title);
        Assert.Equal("https://image.tmdb.org/t/p/w780/kyoto.jpg", page.Cover.BackdropUrl);
    }

    [Fact]
    public async Task TheGroupPage_StillOpens_WithoutBanner_WhenTmdbIsDown()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await WonAsync(await NightAsync(group.Id, "2026-11-05"), "Minuit à Kyoto", 12);
        Kit.Tmdb
            .Setup(tmdb => tmdb.GetDetailsAsync(12, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB unavailable"));

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Null(page.Cover);
        Assert.Equal(1, page.Stats.NightCount);
    }

    [Fact]
    public async Task TheGroupPage_HasNoBannerAndNoFigures_BeforeItsFirstFilm()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await NightAsync(group.Id, "2026-11-26", FriendGroupTestKit.Member);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Null(page.Cover);
        Assert.Equal(0, page.Stats.NightCount);
        Assert.Equal(0, page.Stats.FilmCount);
        Assert.Null(page.Stats.FirstNightDate);
        Kit.Tmdb.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task TheGroupPage_ShowsEveryFilmOfAGroupThatMetOften()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var first = new DateOnly(2026, 1, 1);
        for (var week = 0; week < 20; week++)
            await WonAsync(await NightAsync(group.Id, first.AddDays(7 * week).ToString("yyyy-MM-dd")), $"Film {week}", 100 + week);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Equal(20, page.PastNights.Count);
        Assert.Equal(20, page.Stats.NightCount);
    }

    [Fact]
    public async Task MyGroups_GiveEachGroupItsBannerAndHowManyNightsItHeld()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var quiet = await Kit.CreateAsync("Famille", FriendGroupTestKit.Member);
        await WonAsync(await NightAsync(group.Id, "2026-10-29"), "Brume", 11);
        await WonAsync(await NightAsync(group.Id, "2026-11-05"), "Minuit à Kyoto", 12);
        BackdropOf(12, "Minuit à Kyoto", "https://image.tmdb.org/t/p/w780/kyoto.jpg");

        var mine = await Kit.ListHandler().HandleAsync(FriendGroupTestKit.Member);

        var shown = mine.Showcases.Single(showcase => showcase.GroupId == group.Id);
        Assert.Equal(2, shown.NightCount);
        Assert.Equal("Minuit à Kyoto", shown.Cover?.Title);
        var bare = mine.Showcases.Single(showcase => showcase.GroupId == quiet.Id);
        Assert.Equal(0, bare.NightCount);
        Assert.Null(bare.Cover);
    }
}
