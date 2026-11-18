using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.MovieNights;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class MovieNightsControllerTests
{
    private readonly Mock<IGetMovieNightsHandler> _handler = new();
    private readonly MovieNightsController _sut = new MovieNightsController().WithContext();

    [Theory]
    [InlineData(MovieMediaType.Movie)]
    [InlineData(MovieMediaType.Tv)]
    public async Task Get_Authenticated_ServesTheSummaryOfThatTitleForTheViewer(MovieMediaType mediaType)
    {
        var response = new MovieNightsResponse { ProposalCount = 2 };
        _handler.Setup(h => h.HandleAsync("u1", 1_399, mediaType, It.IsAny<CancellationToken>())).ReturnsAsync(response);

        var result = await _sut.Get(1_399, mediaType, _handler.Object, "u1", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, ok.Value);
    }

    [Fact]
    public void Get_IsReservedToSignedInUsersAndRateLimitedLikeTheDetails()
    {
        var method = typeof(MovieNightsController).GetMethod(nameof(MovieNightsController.Get))!;

        Assert.NotEmpty(typeof(MovieNightsController).GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true));
        var rateLimit = Assert.Single(method.GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: true));
        Assert.Equal(RateLimitingExtensions.MovieDetailsPolicy, ((EnableRateLimitingAttribute)rateLimit).PolicyName);
    }
}
