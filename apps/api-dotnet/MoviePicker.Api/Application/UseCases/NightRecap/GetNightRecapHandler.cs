using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.NightRecap;

public sealed class GetNightRecapHandler : IGetNightRecapHandler
{
    private readonly IEventRepository _events;
    private readonly IGetEventDetailHandler _detail;
    private readonly IListMoviesForEventHandler _movies;

    public GetNightRecapHandler(IEventRepository events, IGetEventDetailHandler detail, IListMoviesForEventHandler movies)
    {
        _events = events;
        _detail = detail;
        _movies = movies;
    }

    public async Task<NightRecapResponse> HandleAsync(string recapSlug, CancellationToken ct = default)
    {
        var evt = await _events.GetByRecapSlugAsync(recapSlug, ct) ?? throw Errors.EventNotFound();
        var detail = await _detail.HandleAsync(evt.Slug, ct);
        var insider = detail.IsHost || detail.MyParticipant is not null;

        return new NightRecapResponse
        {
            RecapSlug = recapSlug,
            EventSlug = insider ? evt.Slug : null,
            Title = detail.Title,
            Date = detail.Date,
            Time = detail.Time,
            Config = detail.Config,
            ClosedAt = detail.ClosedAt,
            IsFinished = detail.IsFinished,
            Lifecycle = detail.Lifecycle,
            Winners = detail.Winners,
            MyParticipant = detail.MyParticipant,
            ParticipantCount = detail.ParticipantCount,
            MovieCount = detail.MovieCount,
            Participants = detail.Participants,
            WinnerMovies = await WinnerMoviesAsync(evt.Slug, detail, ct),
        };
    }

    private async Task<IReadOnlyList<MovieWithScoreResponse>> WinnerMoviesAsync(
        string eventSlug,
        EventDetailResponse detail,
        CancellationToken ct)
    {
        if (detail.Winners.Count == 0)
            return [];

        var byId = (await _movies.HandleAsync(eventSlug, detail.MyParticipant?.Id, ct)).ToDictionary(m => m.Id);
        return detail.Winners
            .Select(w => byId.GetValueOrDefault(w.MovieId))
            .OfType<MovieWithScoreResponse>()
            .ToList();
    }
}
