using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryKofiWebhookLogRepositoryTests
{
    private readonly InMemoryKofiWebhookLogRepository _repo = new();

    [Fact]
    public async Task HasProcessed_EmptyId_ReturnsFalse()
    {
        Assert.False(await _repo.HasProcessedAsync(" "));
    }

    [Fact]
    public async Task Record_ThenHasProcessed_ReturnsTrue()
    {
        await _repo.RecordAsync("msg-1", DateTimeOffset.UtcNow);

        Assert.True(await _repo.HasProcessedAsync("msg-1"));
    }

    [Fact]
    public async Task Record_BlankId_DoesNotStore()
    {
        await _repo.RecordAsync("  ", DateTimeOffset.UtcNow);

        Assert.False(await _repo.HasProcessedAsync("  "));
    }

    [Fact]
    public async Task HasProcessed_UnknownId_ReturnsFalse()
    {
        Assert.False(await _repo.HasProcessedAsync("missing"));
    }
}
