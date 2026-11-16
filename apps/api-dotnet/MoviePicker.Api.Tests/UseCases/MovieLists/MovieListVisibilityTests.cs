using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieLists;

public sealed class MovieListVisibilityTests
{
    private readonly MovieListTestKit _kit = new();

    private Task<MovieListSummaryResponse> CreateAsync(string name, bool? isPublic) =>
        _kit.CreateHandler().HandleAsync(Owner, new CreateMovieListRequest { Name = name, IsPublic = isPublic });

    private Task<MovieListSummaryResponse> UpdateAsync(string listId, bool? isPublic, string userId = Owner) =>
        _kit.UpdateHandler().HandleAsync(userId, listId, new UpdateMovieListRequest { Name = "Films cultes", IsPublic = isPublic });

    [Theory]
    [InlineData(null, false)]
    [InlineData(false, false)]
    [InlineData(true, true)]
    public async Task Create_IsPrivateUnlessAskedOtherwise(bool? requested, bool expected)
    {
        var created = await CreateAsync("Films cultes", requested);

        Assert.Equal(expected, created.IsPublic);
        Assert.Equal(expected, (await _kit.GetHandler().HandleAsync(Owner, created.Id)).IsPublic);
        Assert.Equal(expected, Assert.Single((await _kit.ListHandler().HandleAsync(Owner, null)).Items).IsPublic);
    }

    [Theory]
    [InlineData(false, true, true)]
    [InlineData(true, false, false)]
    [InlineData(true, null, true)]
    [InlineData(false, null, false)]
    public async Task Update_ChangesTheVisibilityOnlyWhenAsked(bool initial, bool? requested, bool expected)
    {
        var created = await CreateAsync("Films cultes", initial);

        var updated = await UpdateAsync(created.Id, requested);

        Assert.Equal(expected, updated.IsPublic);
        Assert.Equal(expected, (await _kit.Lists.FindAsync(created.Id))!.IsPublic);
    }

    [Fact]
    public async Task Update_OfASharedList_ByAMember_IsRefused_AndTheListStaysPrivate()
    {
        await _kit.PersonAsync(Owner, "Léa");
        await _kit.PersonAsync(Member, "Sam");
        var created = await CreateAsync("Films cultes", isPublic: false);
        await _kit.ShareAsync(created.Id, Member);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => UpdateAsync(created.Id, isPublic: true, userId: Member));

        Assert.Equal(ErrorCodes.ListOwnerOnly, ex.Reason);
        Assert.False((await _kit.Lists.FindAsync(created.Id))!.IsPublic);
    }

    [Fact]
    public async Task Update_ByTheCreatorOfASharedList_MakesItPublic()
    {
        await _kit.PersonAsync(Owner, "Léa");
        await _kit.PersonAsync(Member, "Sam");
        var created = await CreateAsync("Films cultes", isPublic: false);
        await _kit.ShareAsync(created.Id, Member);

        var updated = await UpdateAsync(created.Id, isPublic: true);

        Assert.True(updated.IsPublic);
        var seenByTheMember = (await _kit.ListHandler().HandleAsync(Member, null)).Items.Single();
        Assert.True(seenByTheMember.IsPublic);
    }
}
