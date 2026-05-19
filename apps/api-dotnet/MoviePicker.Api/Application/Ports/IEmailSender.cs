using System.Text;
using MoviePicker.Api.Application.UseCases.Auth;

namespace MoviePicker.Api.Application.Ports;

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}

public sealed record EmailMessage(
    string ToEmail,
    string ToName,
    string Subject,
    string HtmlBody,
    string TextBody,
    string? Tag = null)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append("To = ").Append(EmailMasking.Mask(ToEmail));
        builder.Append(", Subject = \"").Append(Subject).Append('"');
        builder.Append(", Tag = ").Append(Tag ?? "n/a");
        return true;
    }
}
