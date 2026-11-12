using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetMovieDetails;

public sealed class GetMovieDetailsHandler : IGetMovieDetailsHandler
{
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;

    public GetMovieDetailsHandler(ITmdbMovieSearch tmdb, IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _options = options.Value;
    }

    public async Task<MovieDetailsResponse?> HandleAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        if (tmdbId <= 0)
            return null;

        TmdbMovieDetails? details;
        try
        {
            details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, ct).ConfigureAwait(false);
        }
        catch (HttpRequestException)
        {
            throw Errors.MovieDetailsUnavailable();
        }

        if (details is null)
            return null;

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var enrichment = await _tmdb.GetEnrichmentAsync(tmdbId, mediaType, region, ct).ConfigureAwait(false);
        var extras = details.Extras;

        return new MovieDetailsResponse
        {
            TmdbId = details.Id,
            MediaType = mediaType,
            Title = details.Title,
            Overview = details.Overview,
            Tagline = details.Tagline,
            Director = details.Director,
            Cast = details.Cast,
            RuntimeMinutes = details.Runtime,
            Genres = details.Genres,
            ReleaseDate = details.ReleaseDate,
            TrailerUrl = details.TrailerUrl,
            VoteAverage = details.VoteAverage,
            PosterPath = details.PosterUrl,
            BackdropPath = details.BackdropUrl,
            SeasonCount = details.SeasonCount,
            EpisodeCount = details.EpisodeCount,
            WatchProviders = enrichment is null
                ? Array.Empty<WatchProviderOfferResponse>()
                : WatchProviderMapping.ToDto(enrichment.WatchProviders),
            TmdbWatchPageUrl = enrichment?.TmdbWatchPageUrl,
            OriginalTitle = extras?.OriginalTitle,
            OriginalLanguage = extras?.OriginalLanguage,
            ProductionCountries = extras?.ProductionCountries ?? [],
            Budget = extras?.Budget,
            VoteCount = extras?.VoteCount,
            Certification = extras?.Certification,
            Collection = extras?.Collection is { } collection
                ? new MovieDetailsCollectionResponse { Id = collection.Id, Name = collection.Name }
                : null,
            DirectorId = extras?.DirectorId,
            CastMembers = extras is null ? [] : extras.CastMembers.Select(ToCastMemberResponse).ToList(),
            Crew = extras is null ? [] : extras.Crew.Select(ToCrewMemberResponse).ToList(),
            Videos = extras is null ? [] : extras.Videos.Select(ToVideoResponse).ToList(),
        };
    }

    private static MovieCastMemberResponse ToCastMemberResponse(TmdbCastMember member) => new()
    {
        Name = member.Name,
        Character = member.Character,
        ProfilePath = member.ProfileUrl,
    };

    private static MovieCrewMemberResponse ToCrewMemberResponse(TmdbCrewCredit credit) => new()
    {
        Job = credit.Job,
        Name = credit.Name,
    };

    private static MovieVideoResponse ToVideoResponse(TmdbVideo video) => new()
    {
        Key = video.Key,
        Name = video.Name,
        Type = video.Type,
        Language = video.Language,
    };
}
