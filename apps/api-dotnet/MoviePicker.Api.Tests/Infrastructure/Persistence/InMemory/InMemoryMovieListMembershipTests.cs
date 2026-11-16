using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryMovieListMembershipTests : MovieListMembershipContract
{
    protected override IMovieListRepository Lists { get; } = new InMemoryMovieListRepository();
}
