using Microsoft.AspNetCore.DataProtection;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.TwoFactor;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.TwoFactor;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Security;
using MoviePicker.Api.Tests.Builders;

namespace MoviePicker.Api.Tests.UseCases.Auth.TwoFactor;

internal sealed class TwoFactorTestKit
{
    public const string UserId = "507f1f77bcf86cd799439011";
    public const string Password = "abcd1234";
    public const string PasswordHash = "HASHED";

    public static readonly byte[] Secret = "12345678901234567890"u8.ToArray();

    public MovableClock Clock { get; } = new(new DateTimeOffset(2026, 11, 27, 9, 0, 0, TimeSpan.Zero));
    public InMemoryUserRepository Users { get; } = new();
    public Mock<IPasswordHasher> Hasher { get; } = new();
    public InMemoryRateLimitCounterStore Counters { get; }
    public DataProtectionSecretSealer Sealer { get; }

    public TwoFactorTestKit()
    {
        Counters = new InMemoryRateLimitCounterStore(Clock);
        Sealer = new DataProtectionSecretSealer(new EphemeralDataProtectionProvider(), Clock);
        Hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(PasswordVerification.Failed);
        Hasher.Setup(h => h.Verify(PasswordHash, Password)).Returns(PasswordVerification.Success);
    }

    public TwoFactorCodeCheck CodeCheck() => new(Sealer, Counters, Clock);

    public string CurrentCode() => Totp.CodeAt(Secret, Totp.StepAt(Clock.GetUtcNow()));

    public Task<User> AddUserAsync(bool withPassword = true, IReadOnlyList<string>? backupCodes = null, bool enabled = false) =>
        Users.AddAsync(new User
        {
            Id = UserId,
            Email = "lea@example.com",
            DisplayName = "Léa",
            PasswordHash = withPassword ? PasswordHash : string.Empty,
            TwoFactor = enabled || backupCodes is not null ? EnabledSettings(backupCodes ?? []) : null,
            CreatedAt = Clock.GetUtcNow(),
            UpdatedAt = Clock.GetUtcNow()
        });

    public TwoFactorSettings EnabledSettings(IReadOnlyList<string> backupCodes) => new()
    {
        ProtectedSecret = Sealer.Seal(TwoFactorSealing.SecretPurpose, Base32.Encode(Secret)),
        EnabledAt = Clock.GetUtcNow(),
        LastUsedStep = 0,
        BackupCodeHashes = backupCodes.Select(BackupCodes.Hash).ToList()
    };

    public async Task<TwoFactorSettings?> StoredSettingsAsync() => (await Users.GetByIdAsync(UserId))!.TwoFactor;
}
