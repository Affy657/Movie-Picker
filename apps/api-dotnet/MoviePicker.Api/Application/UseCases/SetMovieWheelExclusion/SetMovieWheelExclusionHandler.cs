using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SetMovieWheelExclusion;

public sealed class SetMovieWheelExclusionHandler : ISetMovieWheelExclusionHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;

    public SetMovieWheelExclusionHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IHostTokenAccessor hostTokenAccessor,
        IUnitOfWork unitOfWork,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task HandleAsync(
        string userId,
        string idOrSlug,
        string movieId,
        SetMovieWheelExclusionRequest request,
        CancellationToken ct = default)
    {
        var evt = await HostedEvent.LoadForHostAsync(
            _eventRepository,
            _hostTokenAccessor,
            userId,
            idOrSlug,
            _clock.GetUtcNow(),
            ct);

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw Errors.MovieNotFound();

        if (movie.ExcludedFromWheel == request.Excluded)
            return;

        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, token);
                if (!HostedEvent.IsHost(current, _hostTokenAccessor, userId))
                    throw Errors.HostOnly();
                await _movieRepository.UpdateWheelExclusionAsync(movieId, request.Excluded, token);
                await _eventRepository.UpdateAsync(current with { UpdatedAt = _clock.GetUtcNow() }, token);
            },
            ct);
    }
}
