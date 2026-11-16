using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Tests.Infrastructure.Persistence;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieListMembershipRepositoryTests
    : MovieListMembershipContract, IClassFixture<MoviePickerApplicationFactory>, IDisposable
{
    private readonly IServiceScope _scope;

    public MovieListMembershipRepositoryTests(MoviePickerApplicationFactory factory)
    {
        _ = factory.CreateClient();
        _scope = factory.Services.CreateScope();
        Lists = _scope.ServiceProvider.GetRequiredService<IMovieListRepository>();
    }

    protected override IMovieListRepository Lists { get; }

    public void Dispose() => _scope.Dispose();
}
