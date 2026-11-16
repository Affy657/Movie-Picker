using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieLists;

public sealed class CreateMovieListHandlerTests
{
    private readonly MovieListTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_TrimsNameAndDescription_AndStartsEmpty()
    {
        var created = await _kit.CreateAsync("  Films cultes  ", description: "  Les incontournables  ");

        Assert.False(string.IsNullOrEmpty(created.Id));
        Assert.Equal("Films cultes", created.Name);
        Assert.Equal("Les incontournables", created.Description);
        Assert.Equal(0, created.ItemCount);
        Assert.Empty(created.PosterPaths);
        Assert.False(created.ContainsMovie);
        Assert.Equal(Start, created.CreatedAt);
        Assert.Equal(Start, created.UpdatedAt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task HandleAsync_BlankDescription_IsStoredAsNull(string? description)
    {
        var created = await _kit.CreateAsync("Halloween", description: description);

        Assert.Null(created.Description);
        Assert.Null((await _kit.GetHandler().HandleAsync(Owner, created.Id)).Description);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task HandleAsync_BlankName_IsAValidationError(string name)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _kit.CreateAsync(name));

        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_NameOfSixtyCharactersOnceTrimmed_IsAccepted()
    {
        var name = new string('a', MovieList.MaxNameLength);

        var created = await _kit.CreateAsync($"  {name}  ");

        Assert.Equal(name, created.Name);
    }

    [Fact]
    public async Task HandleAsync_NameBeyondSixtyCharacters_IsAValidationError()
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _kit.CreateAsync(new string('a', MovieList.MaxNameLength + 1)));

        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_DescriptionOfThreeHundredCharacters_IsAccepted_AndOneMoreIsRefused()
    {
        var longest = new string('d', MovieList.MaxDescriptionLength);

        var accepted = await _kit.CreateAsync("Longue", description: longest);
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _kit.CreateAsync("Trop longue", description: longest + "d"));

        Assert.Equal(longest, accepted.Description);
        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
    }

    [Theory]
    [InlineData("Été 2026", "  ete   2026 ")]
    [InlineData("Films cultes", "FILMS CULTES")]
    [InlineData("Ciné du dimanche", "cine du  DIMANCHE")]
    public async Task HandleAsync_NameAlreadyUsedByTheOwner_IsAConflict(string existing, string candidate)
    {
        await _kit.CreateAsync(existing);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.CreateAsync(candidate));

        Assert.Equal(ErrorCodes.ListNameTaken, ex.Reason);
        Assert.Single((await _kit.ListHandler().HandleAsync(Owner, null)).Items);
    }

    [Fact]
    public async Task HandleAsync_NameUsedByAnotherOwner_IsAllowed()
    {
        await _kit.CreateAsync("Films cultes", owner: Stranger);

        var created = await _kit.CreateAsync("Films cultes");

        Assert.Equal("Films cultes", created.Name);
    }

    [Theory]
    [InlineData("À voir")]
    [InlineData("a voir")]
    [InlineData(" À VOIR ")]
    [InlineData("Watchlist")]
    [InlineData("watchlist")]
    [InlineData("Films vus")]
    [InlineData("films vus")]
    [InlineData("Watched")]
    public async Task HandleAsync_NameOfTheSystemList_IsAConflict(string name)
    {
        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.CreateAsync(name));

        Assert.Equal(ErrorCodes.ListNameTaken, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_FiftyFirstList_IsAConflict()
    {
        for (var index = 1; index <= MovieList.MaxPerOwner; index++)
            await _kit.CreateAsync($"Liste {index}");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.CreateAsync("Une de trop"));

        Assert.Equal(ErrorCodes.ListLimitReached, ex.Reason);
        Assert.Equal(MovieList.MaxPerOwner, await _kit.Lists.CountByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_TheLimitIsPerOwner()
    {
        for (var index = 1; index <= MovieList.MaxPerOwner; index++)
            await _kit.CreateAsync($"Liste {index}", owner: Stranger);

        var created = await _kit.CreateAsync("Ma première");

        Assert.Equal("Ma première", created.Name);
    }

    [Fact]
    public async Task HandleAsync_WithAFirstItem_CreatesTheListHoldingIt()
    {
        var created = await _kit.CreateAsync("Films cultes", firstItem: Title(603, Poster(603), title: "  Matrix  "));

        Assert.Equal(1, created.ItemCount);
        Assert.Equal([Poster(603)], created.PosterPaths);
        Assert.True(created.ContainsMovie);
        var item = Assert.Single((await _kit.GetHandler().HandleAsync(Owner, created.Id)).Items);
        Assert.Equal(603, item.TmdbId);
        Assert.Equal("Matrix", item.Title);
        Assert.Equal(Start, item.CreatedAt);
    }

    [Fact]
    public async Task HandleAsync_FirstItemWithAPosterOutsideTmdb_CreatesNothing()
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _kit.CreateAsync("Films cultes", firstItem: Title(603, "https://collect.attacker.example/pixel.png")));

        Assert.Equal(ErrorCodes.InvalidPosterPath, ex.Reason);
        Assert.Equal(0, await _kit.Lists.CountByOwnerAsync(Owner));
    }
}
