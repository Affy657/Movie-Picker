using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieDetails;
using MoviePicker.Api.Application.UseCases.SearchMovies;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class MoviesSearchControllerTests
{
    [Fact]
    public async Task Search_NoFilters_CallsHandlerWithEmptyQueryAndNoFilters()
    {
        var handler = new Mock<ISearchMoviesHandler>();
        var repo = new Mock<IEventRepository>();
        var controller = new MoviesSearchController().WithContext();

        var result = await controller.Search(
            null, null, null, null, null, null, null, handler.Object, repo.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("", false, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Search_WithFiltersAndGenres_BuildsParsedFilters()
    {
        MovieSearchFilters? captured = null;
        var handler = new Mock<ISearchMoviesHandler>();
        handler
            .Setup(h => h.HandleAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<MovieSearchFilters?>(), It.IsAny<CancellationToken>()))
            .Callback<string, bool, MovieSearchFilters?, CancellationToken>((_, _, f, _) => captured = f);
        var repo = new Mock<IEventRepository>();
        var controller = new MoviesSearchController().WithContext();

        await controller.Search(
            "bat", null, "28, 12, x, -3, 0", 2000, 2010, 7.5, "EN", handler.Object, repo.Object, CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal(new[] { 28, 12 }, captured!.GenreIds);
        Assert.Equal(2000, captured.YearFrom);
        Assert.Equal(2010, captured.YearTo);
        Assert.Equal(7.5, captured.VoteMin);
        Assert.Equal("en", captured.OriginalLanguage);
    }

    [Fact]
    public async Task Search_WithEventSlug_UsesEventAllowSeriesConfig()
    {
        var handler = new Mock<ISearchMoviesHandler>();
        var repo = new Mock<IEventRepository>();
        var evt = new EventEntityBuilder().WithSlug("soiree").Build() with { Config = new EventConfig { AllowSeries = true } };
        repo.Setup(r => r.GetByIdOrSlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        var controller = new MoviesSearchController().WithContext();

        await controller.Search("q", "soiree", null, null, null, null, null, handler.Object, repo.Object, CancellationToken.None);

        handler.Verify(
            h => h.HandleAsync("q", true, It.IsAny<MovieSearchFilters?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Search_EventLookupThrows_DefaultsToAllowSeriesFalse()
    {
        var handler = new Mock<ISearchMoviesHandler>();
        var repo = new Mock<IEventRepository>();
        repo.Setup(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));
        var controller = new MoviesSearchController().WithContext();

        await controller.Search("q", "missing", null, null, null, null, null, handler.Object, repo.Object, CancellationToken.None);

        handler.Verify(
            h => h.HandleAsync("q", false, It.IsAny<MovieSearchFilters?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetDetails_Found_ReturnsOk()
    {
        var handler = new Mock<IGetMovieDetailsHandler>();
        handler.Setup(h => h.HandleAsync(42, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MovieDetailsResponse { TmdbId = 42 });
        var controller = new MoviesSearchController().WithContext();

        var result = await controller.GetDetails(42, MovieMediaType.Movie, handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetDetails_NotFound_Returns404()
    {
        var handler = new Mock<IGetMovieDetailsHandler>();
        var controller = new MoviesSearchController().WithContext();

        var result = await controller.GetDetails(99, MovieMediaType.Tv, handler.Object, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }
}
