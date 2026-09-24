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

    [Fact]
    public async Task GetOrLoadAsync_NotShared_UsesMemoryAndSingleFlightOnly()
    {
        var sut = Build();

        var first = await sut.GetOrLoadAsync("k", Ttl, _ => Task.FromResult("loaded"), shareAcrossInstances: false);
        var second = await sut.GetOrLoadAsync("k", Ttl, _ => Task.FromResult("again"), shareAcrossInstances: false);

        Assert.Equal("loaded", first);
        Assert.Equal("loaded", second);
        _shared.Verify(c => c.TryGetAsync<string>(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _shared.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetOrLoadCheckedAsync_IncompleteLoad_IsKeptBrieflyOnThisInstanceOnly()
    {
        var clock = new ManualClock();
        using var memory = new MemoryCache(new MemoryCacheOptions { Clock = clock });
        var sut = new SharedCacheReadThrough(memory, _shared.Object, new SingleFlight());
        var loads = 0;
        Task<CacheLoad<string>> Load(CancellationToken _)
        {
            loads++;
            return Task.FromResult(new CacheLoad<string>("partial", IsComplete: false));
        }

        var first = await sut.GetOrLoadCheckedAsync("k", Ttl, Load);
        var second = await sut.GetOrLoadCheckedAsync("k", Ttl, Load);
        clock.UtcNow += SharedCacheReadThrough.IncompleteLoadTtl + TimeSpan.FromSeconds(1);
        var afterTheWindow = await sut.GetOrLoadCheckedAsync("k", Ttl, Load);

        Assert.Equal("partial", first);
        Assert.Equal("partial", second);
        Assert.Equal("partial", afterTheWindow);
        Assert.Equal(2, loads);
        _shared.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RefreshAsync_CompleteLoad_ReplacesAnIncompleteLoadKeptInMemory()
    {
        var sut = Build();
        await sut.GetOrLoadCheckedAsync("k", Ttl, _ => Task.FromResult(new CacheLoad<string>("partial", IsComplete: false)));

        await sut.RefreshAsync("k", Ttl, _ => Task.FromResult(new CacheLoad<string>("complete", IsComplete: true)));

        Assert.Equal("complete", await sut.GetOrLoadCheckedAsync("k", Ttl, _ => Task.FromResult(new CacheLoad<string>("reloaded", IsComplete: true))));
    }

    private sealed class ManualClock : Microsoft.Extensions.Internal.ISystemClock
    {
        public DateTimeOffset UtcNow { get; set; } = DateTimeOffset.UtcNow;
    }

    [Fact]
    public async Task RefreshAsync_CompleteLoad_OverwritesBothCachesWhateverTheirAge()
    {
        _memory.Set("k", "old");

        var refreshed = await Build().RefreshAsync("k", Ttl, _ => Task.FromResult(new CacheLoad<string>("fresh", IsComplete: true)));

        Assert.True(refreshed);
        Assert.Equal("fresh", _memory.Get<string>("k"));
        _shared.Verify(c => c.SetAsync("k", "fresh", Ttl, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RefreshAsync_IncompleteLoad_KeepsTheSnapshotAlreadyServed()
    {
        _memory.Set("k", "good");

        var refreshed = await Build().RefreshAsync("k", Ttl, _ => Task.FromResult(new CacheLoad<string>("degraded", IsComplete: false)));

        Assert.False(refreshed);
        Assert.Equal("good", _memory.Get<string>("k"));
        _shared.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetOrLoadAsync_SizeLimitedMemory_AcceptsTheEntries()
    {
        using var bounded = new MemoryCache(new MemoryCacheOptions { SizeLimit = 10 });
        var cache = new SharedCacheReadThrough(bounded, _shared.Object, new SingleFlight());

        var value = await cache.GetOrLoadAsync("k", Ttl, _ => Task.FromResult("loaded"));

        Assert.Equal("loaded", value);
        Assert.Equal("loaded", bounded.Get<string>("k"));
    }
}
