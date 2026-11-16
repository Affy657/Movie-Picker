using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Tests.UseCases.MovieLists;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieListMembers;

public abstract class MovieListMembershipTestBase
{
    internal MovieListTestKit Kit { get; } = new();

    protected async Task<MovieListSummaryResponse> SharedListAsync(params string[] members)
    {
        await Kit.PersonAsync(Owner, "Léa");
        await Kit.PersonAsync(Member, "Sam");
        await Kit.PersonAsync(Invitee, "Zoé");
        await Kit.PersonAsync(Stranger, "Intrus");
        var list = await Kit.CreateAsync("Halloween");
        if (members.Length > 0)
            await Kit.ShareAsync(list.Id, members);
        return list;
    }

    protected async Task FillAsync(string listId, int seatsToTake)
    {
        for (var index = 1; index <= seatsToTake; index++)
        {
            var id = $"seat-{index}";
            await Kit.PersonAsync(id, $"Place {index}");
            await Kit.ShareAsync(listId, id);
        }
    }
}
