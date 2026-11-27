using Microsoft.AspNetCore.DataProtection;
using MoviePicker.Api.Infrastructure.Security;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Security;

public sealed class DataProtectionSecretSealerTests
{
    private readonly DataProtectionSecretSealer _sealer = new(new EphemeralDataProtectionProvider(), TimeProvider.System);

    [Fact]
    public void TryOpen_GivesBackWhatSealHid()
    {
        var sealedPayload = _sealer.Seal("purpose-a", "JBSWY3DPEHPK3PXP");

        Assert.DoesNotContain("JBSWY3DPEHPK3PXP", sealedPayload, StringComparison.Ordinal);
        Assert.Equal("JBSWY3DPEHPK3PXP", _sealer.TryOpen("purpose-a", sealedPayload));
    }

    [Fact]
    public void TryOpen_RefusesAPayloadSealedForAnotherPurpose()
    {
        var sealedPayload = _sealer.Seal("purpose-a", "secret");

        Assert.Null(_sealer.TryOpen("purpose-b", sealedPayload));
    }

    [Fact]
    public void TryOpen_RefusesAnExpiredPayload()
    {
        var sealedPayload = _sealer.Seal("purpose-a", "secret", DateTimeOffset.UtcNow.AddSeconds(-1));

        Assert.Null(_sealer.TryOpen("purpose-a", sealedPayload));
    }

    [Fact]
    public void TryOpen_RefusesSomethingThatWasNeverSealed()
    {
        Assert.Null(_sealer.TryOpen("purpose-a", "not-a-sealed-payload"));
    }
}
