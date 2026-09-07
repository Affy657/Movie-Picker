using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Security;

public sealed class SchedulerTokenValidator : ISchedulerTokenValidator
{
    private readonly byte[]? _expected;

    public SchedulerTokenValidator(IOptions<MoviePickerOptions> options)
    {
        var configured = options.Value.SchedulerToken;
        _expected = string.IsNullOrWhiteSpace(configured)
            ? null
            : Encoding.UTF8.GetBytes(configured.Trim());
    }

    public bool IsConfigured => _expected is not null;

    public bool IsValid(string? presentedToken)
    {
        if (_expected is null || string.IsNullOrWhiteSpace(presentedToken))
            return false;

        var presented = Encoding.UTF8.GetBytes(presentedToken.Trim());
        return CryptographicOperations.FixedTimeEquals(presented, _expected);
    }
}
