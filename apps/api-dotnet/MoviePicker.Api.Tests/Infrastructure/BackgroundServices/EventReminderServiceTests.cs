using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Infrastructure.BackgroundServices;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.BackgroundServices;

public sealed class EventReminderServiceTests
{
    private static readonly TimeSpan SignalTimeout = TimeSpan.FromSeconds(5);

    private readonly Mock<IEventReminderPass> _pass = new();
    private readonly TaskCompletionSource _ran = new(TaskCreationOptions.RunContinuationsAsynchronously);

    private EventReminderService CreateService()
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => _pass.Object);
        var provider = services.BuildServiceProvider();

        return new EventReminderService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<EventReminderService>.Instance);
    }

    private void SignalWhenPassRuns() =>
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EventReminderPassResult(0, 0, 0, 0))
            .Callback(() => _ran.TrySetResult());

    private async Task AwaitFirstPass()
    {
        var completed = await Task.WhenAny(_ran.Task, Task.Delay(SignalTimeout));
        Assert.Same(_ran.Task, completed);
    }

    [Fact]
    public async Task ExecuteAsync_RunsThePassAsSoonAsItStarts()
    {
        SignalWhenPassRuns();
        var service = CreateService();

        await service.StartAsync(CancellationToken.None);
        await AwaitFirstPass();
        await service.StopAsync(CancellationToken.None);

        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExecuteAsync_PassThrows_KeepsTheHostAlive()
    {
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("base injoignable"))
            .Callback(() => _ran.TrySetResult());
        var service = CreateService();

        await service.StartAsync(CancellationToken.None);
        await AwaitFirstPass();

        Assert.NotNull(service.ExecuteTask);
        Assert.False(service.ExecuteTask!.IsFaulted);

        await service.StopAsync(CancellationToken.None);
    }

    [Fact]
    public async Task ExecuteAsync_StoppedRightAway_EndsWithoutFaulting()
    {
        SignalWhenPassRuns();
        var service = CreateService();

        await service.StartAsync(CancellationToken.None);
        await AwaitFirstPass();
        await service.StopAsync(CancellationToken.None);

        Assert.NotNull(service.ExecuteTask);
        Assert.True(service.ExecuteTask!.IsCompletedSuccessfully);
    }

    [Fact]
    public async Task ExecuteAsync_ResolvesThePassFromItsOwnScope()
    {
        SignalWhenPassRuns();
        var service = CreateService();

        await service.StartAsync(CancellationToken.None);
        await AwaitFirstPass();
        await service.StopAsync(CancellationToken.None);

        _pass.Verify(p => p.RunAsync(It.Is<CancellationToken>(ct => ct.CanBeCanceled)), Times.AtLeastOnce);
    }
}
