using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IEventRepository
{
    Task<Event?> GetByIdOrSlugAsync(string idOrSlug, CancellationToken ct = default);
    Task<Event> AddAsync(Event evt, CancellationToken ct = default);
    Task<Event> UpdateAsync(Event evt, CancellationToken ct = default);
}
