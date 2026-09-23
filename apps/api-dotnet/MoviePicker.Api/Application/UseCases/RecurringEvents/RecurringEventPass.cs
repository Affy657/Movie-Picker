using System.Globalization;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.Services;

namespace MoviePicker.Api.Application.UseCases.RecurringEvents;

public interface IRecurringEventPass
{
    Task<RecurringEventPassResult> RunAsync(CancellationToken ct = default);

    Task<RecurringEventPassResult> RunForCreatorAsync(string creatorUserId, CancellationToken ct = default);
}

public sealed record RecurringEventPassResult(int Candidates, int Created, int Stopped, int Failed = 0);

public sealed class RecurringEventPass : IRecurringEventPass
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;
    private readonly ILogger<RecurringEventPass> _logger;

    public RecurringEventPass(
        IEventRepository events,
        IParticipantRepository participants,
        IUserRepository users,
        IUnitOfWork unitOfWork,
        TimeProvider clock,
        ILogger<RecurringEventPass> logger)
    {
        _events = events;
        _participants = participants;
        _users = users;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _logger = logger;
    }

    public Task<RecurringEventPassResult> RunAsync(CancellationToken ct = default) =>
        SweepAsync(null, ct);

    public Task<RecurringEventPassResult> RunForCreatorAsync(string creatorUserId, CancellationToken ct = default) =>
        string.IsNullOrWhiteSpace(creatorUserId)
            ? Task.FromResult(new RecurringEventPassResult(0, 0, 0))
            : SweepAsync(creatorUserId.Trim(), ct);

    private async Task<RecurringEventPassResult> SweepAsync(string? creatorUserId, CancellationToken ct)
    {
        var now = _clock.GetUtcNow();
        var today = EventRecurrence.TodayInParis(now);

        IReadOnlyList<Event> candidates;
        try
        {
            candidates = await _events.ListRecurringAwaitingNextOccurrenceAsync(creatorUserId, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reload the recurring movie nights awaiting an occurrence");
            return new RecurringEventPassResult(0, 0, 0, Failed: 1);
        }

        var created = 0;
        var stopped = 0;
        var failed = 0;

        foreach (var parent in candidates)
        {
            if (parent.Recurrence is not { } frequency
                || !string.IsNullOrEmpty(parent.NextOccurrenceEventId)
                || !parent.IsFinished(now))
                continue;

            if (!DateOnly.TryParse(parent.Date, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parentDate))
                continue;

            if (EventRecurrence.NextDate(parentDate, frequency, today) is not { } nextDate)
            {
                await StopSeriesAsync(parent, now, "series dormant beyond the catch-up limit", ct);
                stopped++;
                continue;
            }

            var host = string.IsNullOrWhiteSpace(parent.CreatorUserId)
                ? null
                : await _users.GetByIdAsync(parent.CreatorUserId, ct);

            if (host is null)
            {
                await StopSeriesAsync(parent, now, "host not found", ct);
                stopped++;
                continue;
            }

            switch (await TryCreateNextOccurrenceAsync(parent, host, nextDate, now, ct))
            {
                case OccurrenceOutcome.Created:
                    created++;
                    break;
                case OccurrenceOutcome.Failed:
                    failed++;
                    break;
            }
        }

        return new RecurringEventPassResult(candidates.Count, created, stopped, failed);
    }

    private enum OccurrenceOutcome
    {
        Created,
        CreatedElsewhere,
        Failed
    }

    private async Task<OccurrenceOutcome> TryCreateNextOccurrenceAsync(
        Event parent,
        User host,
        DateOnly nextDate,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var next = parent with
        {
            Id = string.Empty,
            Date = nextDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Slug = SlugGenerator.NewSlug(),
            HostToken = SlugGenerator.NewHostToken(),
            ClosedAt = null,
            Winners = [],
            WinnerAnnouncedAt = null,
            WatchlistCleanedAt = null,
            RecurrenceParentEventId = parent.Id,
            NextOccurrenceEventId = null,
            CreationRequestId = null,
            CreatedAt = now,
            UpdatedAt = now,
            Version = 0
        };

        try
        {
            await _unitOfWork.ExecuteAsync(
                async token =>
                {
                    var occurrence = await _events.AddAsync(next, token);
                    await _participants.AddAsync(
                        new Participant
                        {
                            Id = string.Empty,
                            EventId = occurrence.Id,
                            Pseudo = HostPseudo(host),
                            UserId = host.Id,
                            CreatedAt = now,
                            UpdatedAt = now
                        },
                        token);
                    await _events.UpdateAsync(
                        parent with { NextOccurrenceEventId = occurrence.Id, UpdatedAt = now },
                        token);
                },
                ct);
        }
        catch (ConflictException conflict)
        {
            if (await WasCreatedElsewhereAsync(parent.Id, ct))
                return OccurrenceOutcome.CreatedElsewhere;

            _logger.LogError(
                conflict,
                "Next occurrence of movie night {EventId} not created: the transaction gave up",
                parent.Id);
            return OccurrenceOutcome.Failed;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to create the next occurrence of movie night {EventId}",
                parent.Id);
            return OccurrenceOutcome.Failed;
        }

        _logger.LogInformation(
            "Next occurrence created for movie night {EventId} on {Date}",
            parent.Id,
            next.Date);
        return OccurrenceOutcome.Created;
    }

    private async Task<bool> WasCreatedElsewhereAsync(string parentId, CancellationToken ct)
    {
        try
        {
            var reloaded = await _events.GetByIdOrSlugAsync(parentId, ct);
            return !string.IsNullOrEmpty(reloaded?.NextOccurrenceEventId);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Movie night {EventId} could not be reloaded after a conflict", parentId);
            return false;
        }
    }

    private async Task StopSeriesAsync(Event parent, DateTimeOffset now, string reason, CancellationToken ct)
    {
        try
        {
            await _events.UpdateAsync(parent with { Recurrence = null, UpdatedAt = now }, ct);
            _logger.LogInformation(
                "Recurrence stopped on movie night {EventId}: {Reason}",
                parent.Id,
                reason);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to stop the recurrence on movie night {EventId}", parent.Id);
        }
    }

    private static string HostPseudo(User host)
    {
        var pseudo = string.IsNullOrWhiteSpace(host.DisplayName)
            ? host.Email.Split('@')[0]
            : host.DisplayName.Trim();
        return string.IsNullOrEmpty(pseudo) ? "Participant" : pseudo;
    }
}
