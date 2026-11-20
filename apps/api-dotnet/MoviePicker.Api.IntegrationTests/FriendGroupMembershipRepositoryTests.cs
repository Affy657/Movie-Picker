using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Tests.Infrastructure.Persistence;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class FriendGroupMembershipRepositoryTests
    : FriendGroupMembershipContract, IClassFixture<MoviePickerApplicationFactory>, IDisposable
{
    private readonly IServiceScope _scope;

    public FriendGroupMembershipRepositoryTests(MoviePickerApplicationFactory factory)
    {
        _ = factory.CreateClient();
        _scope = factory.Services.CreateScope();
        Groups = _scope.ServiceProvider.GetRequiredService<IFriendGroupRepository>();
    }

    protected override IFriendGroupRepository Groups { get; }

    public void Dispose() => _scope.Dispose();
}
