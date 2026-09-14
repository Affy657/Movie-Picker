using Microsoft.Extensions.Caching.Memory;
using Moq;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class SharedCacheReadThroughTests
{
    private readonly MemoryCache _memory = new(new MemoryCacheOptions());
    private readonly Mock<ISharedCache> _shared = new();
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(1);

    private SharedCacheReadThrough Build() => new(_memory, _shared.Object, new SingleFlight());

    [Fact]
    public async Task GetOrLoadAsync_MemoryHit_SkipsSharedCacheAndLoader()
    {
        _memory.Set("k", "cached");

        var value = await Build().GetOrLoadAsync("k", Ttl, _ => Task.FromResult("loaded"));

        Assert.Equal("cached", value);
        _shared.Verify(c => c.TryGetAsync<string>(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetOrLoadAsync_SharedHit_FillsMemoryWithoutLoading()
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(30);
        _shared.Setup(c => c.TryGetAsync<string>("k", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SharedCacheEntry<string>("shared", expiresAt));
        var loads = 0;

        var value = await Build().GetOrLoadAsync("k", Ttl, _ => { loads++; return Task.FromResult("loaded"); });

        Assert.Equal("shared", value);
        Assert.Equal(0, loads);
        Assert.Equal("shared", _memory.Get<string>("k"));
    }

    [Fact]
    public async Task GetOrLoadAsync_Miss_LoadsThenWritesBothCaches()
    {
        var value = await Build().GetOrLoadAsync("k", Ttl, _ => Task.FromResult("loaded"));

        Assert.Equal("loaded", value);
        Assert.Equal("loaded", _memory.Get<string>("k"));
        _shared.Verify(c => c.SetAsync("k", "loaded", Ttl, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetOrLoadAsync_ConcurrentMisses_LoadOnce()
    {
        var gate = new TaskCompletionSource<string>();
        var loads = 0;
        var sut = Build();

        var first = sut.GetOrLoadAsync("k", Ttl, _ => { Interlocked.Increment(ref loads); return gate.Task; });
        var second = sut.GetOrLoadAsync("k", Ttl, _ => { Interlocked.Increment(ref loads); return gate.Task; });
        gate.SetResult("loaded");

        Assert.Equal("loaded", await first);
        Assert.Equal("loaded", await second);
        Assert.Equal(1, loads);
        _shared.Verify(c => c.SetAsync("k", "loaded", Ttl, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetOrLoadAsync_LoaderFailure_LeavesCachesEmpty()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => Build().GetOrLoadAsync<string>("k", Ttl, _ => throw new InvalidOperationException("tmdb")));

        Assert.False(_memory.TryGetValue("k", out _));
        _shared.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
