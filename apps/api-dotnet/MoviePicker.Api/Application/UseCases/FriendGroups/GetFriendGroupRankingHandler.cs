using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class GetFriendGroupRankingHandler : IGetFriendGroupRankingHandler
{
    public const int RankedNightsCap = 200;

    private readonly IFriendGroupRepository _groups;
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IMovieRepository _movies;
    private readonly IVoteRepository _votes;
    private readonly ISeenMarkRepository _seenMarks;
    private readonly IMovieRatingRepository _ratings;
    private readonly TimeProvider _clock;

    public GetFriendGroupRankingHandler(
        IFriendGroupRepository groups,
        IEventRepository events,
        IParticipantRepository participants,
        IMovieRepository movies,
        IVoteRepository votes,
        ISeenMarkRepository seenMarks,
        IMovieRatingRepository ratings,
        TimeProvider clock)
    {
        _groups = groups;
        _events = events;
        _participants = participants;
        _movies = movies;
        _votes = votes;
        _seenMarks = seenMarks;
        _ratings = ratings;
        _clock = clock;
    }

    public async Task<FriendGroupRankingResponse> HandleAsync(string userId, string groupId, CancellationToken ct = default)
    {
        var group = await FriendGroupPolicy.RequireAsync(_groups, userId, groupId, ct);
        var now = _clock.GetUtcNow();
        var nights = (await _events.ListByGroupIdsAsync([group.Id], ct))
            .Where(night => night.HasWinner && night.IsFinished(now))
            .OrderByDescending(night => night.Date, StringComparer.Ordinal)
            .Take(RankedNightsCap)
            .ToList();

        var history = nights.Count == 0 ? FriendGroupHistory.Empty : await LoadHistoryAsync(nights, ct);
        var members = new[] { new FriendGroupMember(group.OwnerId, group.CreatedAt) }.Concat(group.Members);
        return new FriendGroupRankingResponse
        {
            NightCount = nights.Count,
            Members = members.Select(history.StatsOf).ToList()
        };
    }

    private async Task<FriendGroupHistory> LoadHistoryAsync(IReadOnlyList<Event> nights, CancellationToken ct)
    {
        var nightIds = nights.Select(night => night.Id).ToList();
        var participantsTask = _participants.ListByEventIdsAsync(nightIds, ct);
        var moviesTask = _movies.ListByEventIdsAsync(nightIds, ct);
        var ratingsTask = _ratings.ListByEventIdsAsync(nightIds, ct);
        await Task.WhenAll(participantsTask, moviesTask, ratingsTask);

        var participantIds = participantsTask.Result.Select(participant => participant.Id).ToList();
        var votesTask = _votes.ListByParticipantIdsAsync(participantIds, ct);
        var seenTask = _seenMarks.ListByParticipantIdsAsync(participantIds, ct);
        await Task.WhenAll(votesTask, seenTask);

        return new FriendGroupHistory(
            nights,
            participantsTask.Result,
            moviesTask.Result,
            votesTask.Result,
            seenTask.Result,
            ratingsTask.Result);
    }
}
