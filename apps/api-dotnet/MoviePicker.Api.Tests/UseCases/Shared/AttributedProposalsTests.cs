using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class AttributedProposalsTests
{
    private static Movie Proposal(string id, string eventId) => new() { Id = id, EventId = eventId, Title = id };

    [Fact]
    public void Among_LeavesOutOnlyTheProposalsOfAnonymousNights()
    {
        Event[] nights =
        [
            new() { Id = "open" },
            new() { Id = "anonymous", Config = new EventConfig { AnonymousProposals = true } }
        ];

        var kept = AttributedProposals.Among(
            [Proposal("m-open", "open"), Proposal("m-anonymous", "anonymous"), Proposal("m-unknown", "gone")],
            nights);

        Assert.Equal(["m-open", "m-unknown"], kept.Select(movie => movie.Id));
    }
}
