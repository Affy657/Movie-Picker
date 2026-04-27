using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.DeleteEvent;

/// <summary>
/// Supprime définitivement une soirée. Règle métier forte côté V1 : seul le
/// créateur de la soirée (compte connecté) peut effectuer cette action. Le
/// hostToken seul ne suffit pas — un hôte étant nécessairement connecté
/// (cf. <c>CreateEventHandler</c>).
///
/// <para>
/// La cascade est effectuée dans un ordre sûr (feuilles → racine) pour que, en
/// cas d'échec à mi-parcours, les enregistrements restants ne référencent pas
/// d'enfants déjà supprimés :
/// votes → marques « déjà vu » → films → participants → événement.
/// </para>
///
/// <para>
/// La suppression est autorisée quel que soit l'état de la soirée
/// (ouverte, roue tirée, close). C'est volontairement plus permissif que
/// <c>RemoveParticipantHandler</c> : l'hôte est maître de son historique et
/// ses données privées ne sont liées à personne d'autre.
/// </para>
///
/// <para>
/// <strong>Limite assumée — best-effort, non transactionnel.</strong> MongoDB
/// supporte les transactions multi-documents en replicaset, mais l'API V1
/// peut tourner sur un mongo standalone (CI / dev / petits déploiements). Si
/// un sous-repo échoue à mi-cascade, des orphelins peuvent rester (films sans
/// événement parent, etc.). Mitigations : ordre feuilles → racine pour ne
/// jamais laisser d'enfants pendant que l'événement existe encore, idempotence
/// des <c>DeleteByEventIdAsync</c> (re-rejouables sans erreur), et compteurs
/// loggés pour investigation post-mortem. Si on ajoute un job de purge
/// d'orphelins, le filtre naturel est <c>eventId NOT IN events</c>.
/// </para>
/// </summary>
public sealed class DeleteEventHandler : IDeleteEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly ILogger<DeleteEventHandler> _logger;

    public DeleteEventHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        ICurrentUserAccessor currentUserAccessor,
        ILogger<DeleteEventHandler> logger)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _currentUserAccessor = currentUserAccessor;
        _logger = logger;
    }

    public async Task<DeleteEventResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw new UnauthorizedException("La suppression d'une soirée nécessite un compte connecté.");

        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (string.IsNullOrEmpty(evt.CreatorUserId) || evt.CreatorUserId != currentUserId)
            throw new ForbiddenException("Seul le créateur de la soirée peut la supprimer.");

        // Cascade en ordre de feuilles → racine. Les compteurs servent uniquement
        // au reporting côté client (toast / message) ; on n'interrompt pas la
        // cascade en cas de 0 retournés par un sous-repo (idempotent).
        var removedVotes = await _voteRepository.DeleteByEventIdAsync(evt.Id, ct);
        var removedSeenMarks = await _seenMarkRepository.DeleteByEventIdAsync(evt.Id, ct);
        var removedMovies = await _movieRepository.DeleteByEventIdAsync(evt.Id, ct);
        var removedParticipants = await _participantRepository.DeleteByEventIdAsync(evt.Id, ct);

        var deleted = await _eventRepository.DeleteAsync(evt.Id, ct);
        if (!deleted)
        {
            // La cascade a réussi mais l'event n'a pas pu être supprimé : log d'alerte
            // pour investiguer (concurrent delete, race condition…). Côté client on
            // remonte une 404 plutôt qu'une 500 pour rester déterministe.
            _logger.LogWarning(
                "DeleteEvent: cascade OK mais l'événement {EventId} n'existait plus à la suppression finale.",
                evt.Id);
            throw new NotFoundException("Soirée introuvable");
        }

        _logger.LogInformation(
            "Event deleted: {EventId} (slug={Slug}, by={UserId}, cascadedVotes={Votes}, seenMarks={Seen}, movies={Movies}, participants={Participants})",
            evt.Id,
            evt.Slug,
            currentUserId,
            removedVotes,
            removedSeenMarks,
            removedMovies,
            removedParticipants);

        return new DeleteEventResponse
        {
            EventId = evt.Id,
            Slug = evt.Slug ?? string.Empty,
            Message = "Soirée supprimée.",
            RemovedParticipants = removedParticipants,
            RemovedMovies = removedMovies,
            RemovedVotes = removedVotes,
            RemovedSeenMarks = removedSeenMarks
        };
    }
}
