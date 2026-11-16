using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.UseCases.MovieLists;
using MoviePicker.Api.Tests.UseCases.SavedLists;

namespace MoviePicker.Api.Tests.UseCases.PublicLists;

internal sealed class PublicListsTestKit
{
    public const string Creator = MovieListTestKit.Owner;
    public const string CreatorHandle = "owner1";
    public const string Member = MovieListTestKit.Member;
    public const string Viewer = MovieListTestKit.Stranger;

    public SavedListTestKit Saved { get; } = new();

    public static string StoredPoster(int tmdbId) => SavedListTestKit.PublicPoster(MovieListTestKit.Poster(tmdbId));

    public MovieListTestKit Lists => Saved.MovieLists;

    public async Task PeopleAsync(bool creatorProfileIsPublic = true)
    {
        await Lists.PersonAsync(Creator, "Léa", creatorProfileIsPublic);
        await Lists.PersonAsync(Member, "Sam");
        await Lists.PersonAsync(Viewer, "Zoé");
    }

    public async Task<MovieListSummaryResponse> ListAsync(
        string name,
        bool isPublic = true,
        string owner = Creator,
        params int[] tmdbIds)
    {
        var created = await Lists.CreateHandler().HandleAsync(
            owner,
            new CreateMovieListRequest { Name = name, Description = $"À propos de {name}", IsPublic = isPublic });
        foreach (var tmdbId in tmdbIds)
        {
            Lists.Clock.Advance(TimeSpan.FromMinutes(1));
            await Lists.AddAsync(created.Id, MovieListTestKit.Title(tmdbId, MovieListTestKit.Poster(tmdbId)), owner);
        }

        return created;
    }

    public async Task MakePrivateAsync(string listId)
    {
        var list = (await Lists.Lists.FindAsync(listId))!;
        await Lists.Lists.UpdateDetailsAsync(list.OwnerId, listId, list.Name, list.Description, isPublic: false, Lists.Clock.Now);
    }

    public async Task HideProfileAsync(string userId)
    {
        var user = (await Lists.Users.GetByIdAsync(userId))!;
        await Lists.Users.UpdateAsync(user with { IsProfilePublic = false });
    }

    public Task<SavedListSummaryResponse> SaveAsync(string listId, string userId = Viewer) =>
        Saved.SaveAsync(ListSourceType.MemberList, listId, userId);
}
