using MongoDB.Bson;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public static class EventDocumentMapper
{
    public static Event ToDomain(EventDocument doc)
    {
        EventConfig? config = null;
        if (doc.Config is not null)
        {
            DateTimeOffset? endDate = null;
            if (doc.Config.TryGetElement("endDate", out var endEl) && endEl.Value.IsValidDateTime)
                endDate = endEl.Value.ToUniversalTime();

            IReadOnlyList<string>? allowedIds = null;
            if (doc.Config.TryGetElement("allowedReactionIds", out var reactEl) && reactEl.Value.IsBsonArray)
            {
                var arr = reactEl.Value.AsBsonArray;
                allowedIds = arr
                    .Where(x => x.IsString)
                    .Select(x => x.AsString)
                    .Where(s => s.Length > 0)
                    .ToList();
            }

            var wheelMode = ParseWheelMode(
                doc.Config.TryGetElement("wheelMode", out var wEl) ? wEl.Value.ToString() : null);

            config = new EventConfig
            {
                Theme = doc.Config.TryGetElement("theme", out var t) ? t.Value.ToString() : null,
                EndDate = endDate,
                MaxProposalsPerParticipant = doc.Config.TryGetElement("maxProposalsPerParticipant", out var mEl)
                    ? ReadOptionalInt32(mEl.Value)
                    : null,
                WheelMode = wheelMode,
                AllowedReactionIds = allowedIds
            };
        }

        return new Event
        {
            Id = doc.Id,
            Title = doc.Title,
            Date = doc.Date,
            Time = doc.Time,
            HostToken = doc.HostToken,
            Slug = doc.Slug,
            CreatorUserId = doc.CreatorUserId,
            Config = config,
            ClosedAt = doc.ClosedAt.HasValue ? new DateTimeOffset(doc.ClosedAt.Value, TimeSpan.Zero) : null,
            WinnerMovieId = doc.WinnerMovieId,
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)
        };
    }

    public static EventDocument ToDocument(Event evt)
    {
        BsonDocument? config = null;
        if (evt.Config is not null)
        {
            config = new BsonDocument();
            if (evt.Config.Theme is { } theme)
                config["theme"] = theme;
            if (evt.Config.EndDate is { } endDate)
                config["endDate"] = endDate.UtcDateTime;
            if (evt.Config.MaxProposalsPerParticipant is { } max)
                config["maxProposalsPerParticipant"] = max;
            config["wheelMode"] = ToWheelModeString(evt.Config.WheelMode);
            if (evt.Config.AllowedReactionIds is not null)
                config["allowedReactionIds"] = new BsonArray(evt.Config.AllowedReactionIds);
        }

        return new EventDocument
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            HostToken = evt.HostToken,
            Slug = evt.Slug,
            CreatorUserId = evt.CreatorUserId,
            Config = config,
            ClosedAt = evt.ClosedAt?.UtcDateTime,
            WinnerMovieId = evt.WinnerMovieId,
            CreatedAt = evt.CreatedAt.UtcDateTime,
            UpdatedAt = evt.UpdatedAt.UtcDateTime
        };
    }

    /// <summary>Lit un entier positif depuis BSON (Int32 ou Int64), sinon null.</summary>
    private static int? ReadOptionalInt32(BsonValue value)
    {
        if (value.IsInt32)
            return value.AsInt32;
        if (value.IsInt64)
        {
            var l = value.AsInt64;
            if (l < int.MinValue || l > int.MaxValue)
                return null;
            return (int)l;
        }

        return null;
    }

    private static WheelMode ParseWheelMode(string? raw) =>
        raw?.Trim().ToLowerInvariant() switch
        {
            "weightedbyvotes" => WheelMode.WeightedByVotes,
            _ => WheelMode.StrictRandom
        };

    private static string ToWheelModeString(WheelMode mode) =>
        mode == WheelMode.WeightedByVotes ? "weightedByVotes" : "strictRandom";
}
