using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieLists;

public sealed class UpdateMovieListHandlerTests
{
    private readonly MovieListTestKit _kit = new();

    private Task<MovieListSummaryResponse> UpdateAsync(string listId, string name, string? description = null, string owner = Owner) =>
        _kit.UpdateHandler().HandleAsync(owner, listId, new UpdateMovieListRequest { Name = name, Description = description });

    [Fact]
    public async Task HandleAsync_RenamesAndRewritesTheDescription_AndBumpsUpdatedAt()
    {
        var created = await _kit.CreateAsync("Films cultes", description: "Avant", firstItem: Title(603, Poster(603)));
        _kit.Clock.Advance(TimeSpan.FromHours(1));

        var updated = await UpdateAsync(created.Id, "  Classiques  ", "  Après  ");

        Assert.Equal(created.Id, updated.Id);
        Assert.Equal("Classiques", updated.Name);
        Assert.Equal("Après", updated.Description);
        Assert.Equal(1, updated.ItemCount);
        Assert.Equal([Poster(603)], updated.PosterPaths);
        Assert.Equal(Start, updated.CreatedAt);
        Assert.Equal(_kit.Clock.Now, updated.UpdatedAt);
        Assert.Equal("Classiques", (await _kit.GetHandler().HandleAsync(Owner, created.Id)).Name);
    }

    [Fact]
    public async Task HandleAsync_WithoutDescription_ClearsIt()
    {
        var created = await _kit.CreateAsync("Films cultes", description: "Avant");

        var updated = await UpdateAsync(created.Id, "Films cultes");

        Assert.Null(updated.Description);
    }

    [Theory]
    [InlineData("Films cultes")]
    [InlineData("FILMS  CULTES")]
    public async Task HandleAsync_ItsOwnNameInAnyCase_IsAllowed(string name)
    {
        var created = await _kit.CreateAsync("Films cultes");

        var updated = await UpdateAsync(created.Id, name);

        Assert.Equal(name, updated.Name);
    }

    [Fact]
    public async Task HandleAsync_TheNameOfAnotherList_IsAConflict()
    {
        await _kit.CreateAsync("Halloween");
        var created = await _kit.CreateAsync("Films cultes");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => UpdateAsync(created.Id, "halloween"));

        Assert.Equal(ErrorCodes.ListNameTaken, ex.Reason);
        Assert.Equal("Films cultes", (await _kit.GetHandler().HandleAsync(Owner, created.Id)).Name);
    }

    [Fact]
    public async Task HandleAsync_TheNameOfTheSystemList_IsAConflict()
    {
        var created = await _kit.CreateAsync("Films cultes");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => UpdateAsync(created.Id, "A VOIR"));

        Assert.Equal(ErrorCodes.ListNameTaken, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_BlankName_IsAValidationError()
    {
        var created = await _kit.CreateAsync("Films cultes");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => UpdateAsync(created.Id, "  "));

        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesList_IsNotFound_EvenWithATakenName()
    {
        await _kit.CreateAsync("Halloween");
        var foreign = await _kit.CreateAsync("Films cultes", owner: Stranger);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => UpdateAsync(foreign.Id, "Halloween"));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
        Assert.Equal("Films cultes", (await _kit.GetHandler().HandleAsync(Stranger, foreign.Id)).Name);
    }
}

public sealed class DeleteMovieListHandlerTests
{
    private readonly MovieListTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_RemovesTheList_AndFreesItsName()
    {
        var created = await _kit.CreateAsync("Films cultes");

        await _kit.DeleteHandler().HandleAsync(Owner, created.Id);

        Assert.Empty((await _kit.ListHandler().HandleAsync(Owner, null)).Items);
        Assert.Equal("Films cultes", (await _kit.CreateAsync("Films cultes")).Name);
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesList_IsNotFound_AndStays()
    {
        var foreign = await _kit.CreateAsync("Films cultes", owner: Stranger);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.DeleteHandler().HandleAsync(Owner, foreign.Id));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
        Assert.Single((await _kit.ListHandler().HandleAsync(Stranger, null)).Items);
    }
}
