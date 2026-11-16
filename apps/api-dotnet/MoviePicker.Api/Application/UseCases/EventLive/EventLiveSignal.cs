using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.EventLive;

public interface IEventLiveSignal;

public sealed record EventChangedSignal(string Stamp) : IEventLiveSignal;

public sealed record EventPresenceSignal(IReadOnlyList<ParticipantPresence> Participants) : IEventLiveSignal;
