using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Logging;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.SavedLists.SavedListTestKit;

namespace MoviePicker.Api.Tests.UseCases.SavedLists;

public sealed class ListSourceReaderTests
{
    private static readonly ListSource Saga = new(ListSourceType.TmdbCollection, "1241");
    private static readonly ListSource Theme = new(ListSourceType.ExplorerTheme, Frissons);

    private readonly SavedListTestKit _kit = new();

    [Theory]
    [InlineData("tmdbCollection", "1241", ListSourceType.TmdbCollection, "1241")]
    [InlineData("TMDBCOLLECTION", " 1241 ", ListSourceType.TmdbCollection, "1241")]
    [InlineData("explorerTheme", "frissons", ListSourceType.ExplorerTheme, "frissons")]
    [InlineData("ExplorerTheme", " Frissons ", ListSourceType.ExplorerTheme, "frissons")]
    [InlineData("explorerTheme", "Theme-Retire", ListSourceType.ExplorerTheme, "theme-retire")]
    public void Parse_ReadsTheSourceInItsCanonicalForm(string type, string id, ListSourceType expectedType, string expectedId)
    {
        Assert.Equal(new ListSource(expectedType, expectedId), ListSourceReader.Parse(type, id));
    }

    [Theory]
    [InlineData(null, "1241")]
    [InlineData("", "1241")]
    [InlineData("trending", "1241")]
    [InlineData("nowPlaying", "1241")]
    [InlineData("collection", "1241")]
    [InlineData("tmdbCollection", null)]
    [InlineData("tmdbCollection", "abc")]
    [InlineData("tmdbCollection", "0")]
    [InlineData("tmdbCollection", "-3")]
    [InlineData("tmdbCollection", "+3")]
    [InlineData("tmdbCollection", "10000001")]
    [InlineData("explorerTheme", "")]
    [InlineData("explorerTheme", "   ")]
    public void Parse_AnythingButASagaOrASelection_IsNotSavable(string? type, string? id)
    {
        var ex = Assert.Throws<BadRequestException>(() => ListSourceReader.Parse(type, id));

        Assert.Equal(ErrorCodes.ListSourceNotSavable, ex.Reason);
    }

    [Fact]
    public async Task RequireFallbackName_OfASaga_IsItsTmdbName()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());

        Assert.Equal(HarryPotterName, await _kit.Reader().RequireFallbackNameAsync(Saga));
    }

    [Fact]
    public async Task RequireFallbackName_OfASelection_IsItsKey()
    {
        Assert.Equal(Frissons, await _kit.Reader().RequireFallbackNameAsync(Theme));
    }

    [Fact]
    public async Task RequireFallbackName_OfASagaTmdbDoesNotKnow_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.Reader().RequireFallbackNameAsync(Saga));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
    }

    [Fact]
    public async Task RequireFallbackName_OfARetiredSelection_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            _kit.Reader().RequireFallbackNameAsync(new ListSource(ListSourceType.ExplorerTheme, "theme-retire")));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
    }

    [Fact]
    public async Task RequireFallbackName_WhileTmdbIsDown_IsUnavailable()
    {
        _kit.Tmdb
            .Setup(t => t.GetCollectionAsync(HarryPotter, It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB down"));

        var ex = await Assert.ThrowsAsync<ServiceUnavailableException>(() => _kit.Reader().RequireFallbackNameAsync(Saga));

        Assert.Equal(ErrorCodes.ListSourceUnavailable, ex.Reason);
    }

    [Fact]
    public async Task RequireFallbackName_WithoutTmdbCredentials_IsUnavailable_WithoutCallingTmdb()
    {
        _kit.Options.TmdbApiKey = null;

        var ex = await Assert.ThrowsAsync<ServiceUnavailableException>(() => _kit.Reader().RequireFallbackNameAsync(Saga));

        Assert.Equal(ErrorCodes.ListSourceUnavailable, ex.Reason);
        _kit.Tmdb.Verify(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Read_ASaga_GivesItsNameAndItsFilmsInTheSourceOrder_WithPublicPosters()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, Film(673, TmdbPoster(673)), Film(671), Film(1920, mediaType: MovieMediaType.Tv));

        var content = await _kit.Reader().ReadAsync(Saga);

        Assert.True(content.IsAvailable);
        Assert.Equal(HarryPotterName, content.Name);
        Assert.Equal(
            [(673, MovieMediaType.Movie, PublicPoster(TmdbPoster(673))), (671, MovieMediaType.Movie, null), (1920, MovieMediaType.Tv, null)],
            content.Titles.Select(title => (title.TmdbId, title.MediaType, title.PosterPath)));
        var first = content.Titles[0];
        Assert.Equal(("Film 673", "2001", (double?)7.5, (int?)152), (first.Title, first.Year, first.VoteAverage, first.RuntimeMinutes));
        Assert.Equal([12, 14], first.GenreIds);
    }

    [Fact]
    public async Task Read_ASelection_GivesItsFilmsWithoutAName()
    {
        _kit.ThemeHas(Frissons, Film(694), Film(539));

        var content = await _kit.Reader().ReadAsync(Theme);

        Assert.True(content.IsAvailable);
        Assert.Null(content.Name);
        Assert.Equal([694, 539], content.Titles.Select(title => title.TmdbId));
    }

    [Fact]
    public async Task Read_TheSagaNameOnlyAsksTmdbOnce()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());

        await _kit.Reader().ReadAsync(Saga);
        var again = await _kit.Reader().ReadAsync(Saga);

        Assert.Equal(HarryPotterName, again.Name);
        _kit.Tmdb.Verify(t => t.GetCollectionAsync(HarryPotter, It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Read_ASagaWhoseNameCannotBeRead_StillGivesItsFilms()
    {
        _kit.SagaFilmsAre(HarryPotter, HarryPotterFilms());
        _kit.Tmdb
            .Setup(t => t.GetCollectionAsync(HarryPotter, It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB down"));

        var content = await _kit.Reader().ReadAsync(Saga);

        Assert.True(content.IsAvailable);
        Assert.Null(content.Name);
        Assert.Equal(5, content.Titles.Count);
    }

    [Fact]
    public async Task Read_ASourceThatFails_LogsItsIdWithoutLineBreakNorControlCharacter()
    {
        var logger = new CapturingLogger<ListSourceReader>();
        var forged = new ListSource(ListSourceType.ExplorerTheme, "frissons\r\nforged\u001b[31m");

        var content = await _kit.Reader(logger: logger).ReadAsync(forged);

        Assert.False(content.IsAvailable);
        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain(entry.Message, char.IsControl);
        Assert.Contains("frissons forged [31m", entry.Message);
    }

    private static Exception SourceFailure(string kind) => kind switch
    {
        "unavailable" => Errors.ShowcaseUnavailable(),
        "unknownTheme" => Errors.UnknownTheme(),
        "http" => new HttpRequestException("TMDB down"),
        "cancelled" => new TaskCanceledException("TMDB timed out"),
        _ => new TimeoutException("TMDB stalled"),
    };

    [Theory]
    [InlineData("unavailable")]
    [InlineData("unknownTheme")]
    [InlineData("http")]
    [InlineData("cancelled")]
    [InlineData("timeout")]
    public async Task Read_ASourceThatFails_IsUnavailable(string kind)
    {
        _kit.SagaHas(HarryPotter, HarryPotterName);
        _kit.SagaFails(HarryPotter, SourceFailure(kind));

        var content = await _kit.Reader().ReadAsync(Saga);

        Assert.False(content.IsAvailable);
        Assert.Empty(content.Titles);
    }

    [Fact]
    public async Task Read_ASourceWithoutAnyFilm_IsUnavailable()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName);

        var content = await _kit.Reader().ReadAsync(Saga);

        Assert.False(content.IsAvailable);
    }

    [Fact]
    public async Task Read_CancelledByTheCaller_IsCancelled()
    {
        using var cancelled = new CancellationTokenSource();
        await cancelled.CancelAsync();
        _kit.SagaFails(HarryPotter, new TaskCanceledException("caller left"));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _kit.Reader().ReadAsync(Saga, cancelled.Token));
    }
}
