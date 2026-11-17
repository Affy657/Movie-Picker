using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Application.UseCases.Watched;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class DeletedAccountWritesTests : IClassFixture<MoviePickerApplicationFactory>, IDisposable
{
    private readonly IServiceScope _scope;

    public DeletedAccountWritesTests(MoviePickerApplicationFactory factory)
    {
        _ = factory.CreateClient();
        _scope = factory.Services.CreateScope();
    }

    public void Dispose() => _scope.Dispose();

    private T Get<T>() where T : notnull => _scope.ServiceProvider.GetRequiredService<T>();

    private async Task<string> DeletedAccountAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var now = DateTimeOffset.UtcNow;
        var email = $"ghost-{suffix}@example.test";
        var user = await Get<IUserRepository>().AddAsync(new User
        {
            Id = string.Empty,
            Email = email,
            DisplayName = "Ghost",
            Handle = "ghost" + suffix,
            CreatedAt = now,
            UpdatedAt = now
        });
        await Get<IDeleteAccountHandler>().HandleAsync(
            user.Id,
            new DeleteAccountRequest { Confirmation = email },
            recentlyAuthenticated: true);
        return user.Id;
    }

    [Fact]
    public async Task WritesReplayedWithTheIdOfADeletedAccount_LeaveNoDocumentBehind()
    {
        var ghost = await DeletedAccountAsync();

        await AssertRefusedAsync(() => Get<ICreateMovieListHandler>().HandleAsync(
            ghost,
            new CreateMovieListRequest
            {
                Name = "Fantôme",
                FirstItem = new AddWatchlistItemRequest { TmdbId = 603, Title = "Matrix", Year = "1999" }
            }));
        await AssertRefusedAsync(() => Get<IMarkWatchedHandler>().HandleAsync(
            ghost,
            new MarkWatchedRequest { TmdbId = 603, Title = "Matrix", Year = "1999" }));
        await AssertRefusedAsync(() => Get<ISaveListHandler>().HandleAsync(
            ghost,
            new SaveListRequest { SourceType = ListSourceNames.ExplorerTheme, SourceId = "frissons" }));
        await AssertRefusedAsync(() => Get<IAddToWatchlistHandler>().HandleAsync(
            ghost,
            new AddWatchlistItemRequest { TmdbId = 680, Title = "Pulp Fiction", Year = "1994" }));
        await AssertRefusedAsync(() => Get<LetterboxdWatchedWriter>().WriteAsync(
            ghost,
            new LetterboxdWatchedSelectionRequest
            {
                TmdbId = 550,
                Title = "Fight Club",
                Year = "1999",
                LetterboxdSlug = "fight-club"
            },
            keepOnWatchlist: false));

        Assert.Empty(await Get<IMovieListRepository>().ListByOwnerAsync(ghost));
        Assert.Empty(await Get<IWatchedTitleRepository>().ListByOwnerAsync(ghost));
        Assert.Equal(0, await Get<ISavedListRepository>().CountByOwnerAsync(ghost));
        Assert.Empty(await Get<IWatchlistRepository>().ListByUserIdAsync(ghost, int.MaxValue));
    }

    private static async Task AssertRefusedAsync(Func<Task> write)
    {
        var refusal = await Assert.ThrowsAsync<NotFoundException>(write);
        Assert.Equal(ErrorCodes.UserNotFound, refusal.Reason);
    }
}
