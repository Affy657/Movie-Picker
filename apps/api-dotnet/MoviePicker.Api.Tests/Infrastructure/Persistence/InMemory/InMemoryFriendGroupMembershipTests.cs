using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryFriendGroupMembershipTests : FriendGroupMembershipContract
{
    protected override IFriendGroupRepository Groups { get; } = new InMemoryFriendGroupRepository();
}
