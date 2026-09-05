using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.GetMovieDetails;
using MoviePicker.Api.Application.UseCases.SearchMovies;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class MoviesSearchControllerTests
{
    [Fact]
    public async Task Search_NoFilters_CallsHandlerWithEmptyQueryAndNoFilters()
    {
        var handler = new Mock<ISearchMoviesHandler>();
        var controller = new MoviesSearchController().WithContext();

        var result = await controller.Search(
            null, null, null, null, null, null, null, null, null, handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("", null, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    private static readonly int[] expected = new[] { 28, 12 };

    [Fact]
    public async Task Search_WithFiltersAndGenres_BuildsParsedFilters()
    {
        MovieSearchFilters? captured = null;
        var handler = new Mock<ISearchMoviesHandler>();
        handler
            .Setup(h => h.HandleAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<MovieSearchFilters?>(), It.IsAny<CancellationToken>()))
            .Callback<string, string?, MovieSearchFilters?, CancellationToken>((_, _, f, _) => captured = f);
        var controller = new MoviesSearchController().WithContext();

        await controller.Search(
            "bat", null, "28, 12, x, -3, 0", 2000, 2010, 7.5, "EN", 60, 150,
            handler.Object, CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal(expected, captured!.GenreIds);
        Assert.Equal(2000, captured.YearFrom);
        Assert.Equal(2010, captured.YearTo);
        Assert.Equal(7.5, captured.VoteMin);
        Assert.Equal("en", captured.OriginalLanguage);
        Assert.Equal(60, captured.RuntimeMin);
        Assert.Equal(150, captured.RuntimeMax);
    }

    [Fact]
    public async Task Search_WithOnlyRuntimeFilter_BuildsFilters()
    {
        MovieSearchFilters? captured = null;
        var handler = new Mock<ISearchMoviesHandler>();
        handler
            .Setup(h => h.HandleAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<MovieSearchFilters?>(), It.IsAny<CancellationToken>()))
            .Callback<string, string?, MovieSearchFilters?, CancellationToken>((_, _, f, _) => captured = f);
        var controller = new MoviesSearchController().WithContext();

        await controller.Search(
            "bat", null, null, null, null, null, null, 60, null, handler.Object, CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal(60, captured!.RuntimeMin);
        Assert.Null(captured.RuntimeMax);
    }

    [Fact]
    public async Task Search_WithEventSlug_ForwardsSlugToHandler()
    {
        var handler = new Mock<ISearchMoviesHandler>();
        var controller = new MoviesSearchController().WithContext();

        await controller.Search("q", "soiree", null, null, null, null, null, null, null, handler.Object, CancellationToken.None);

        handler.Verify(
            h => h.HandleAsync("q", "soiree", It.IsAny<MovieSearchFilters?>(), It.IsAny<CancellationToken>()), Times.Once);
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
