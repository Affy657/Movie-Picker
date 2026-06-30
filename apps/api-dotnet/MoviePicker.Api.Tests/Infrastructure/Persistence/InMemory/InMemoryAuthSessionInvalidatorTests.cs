using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAuthSessionInvalidatorTests
{
    [Fact]
    public async Task InvalidateAllForUserAsync_ReturnsZero()
    {
        var invalidator = new InMemoryAuthSessionInvalidator(
            NullLogger<InMemoryAuthSessionInvalidator>.Instance);

        var count = await invalidator.InvalidateAllForUserAsync("u1");

        Assert.Equal(0L, count);
    }
}
