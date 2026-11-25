namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

[AttributeUsage(AttributeTargets.Parameter)]
public sealed class ValuesOfAttribute(Type constants) : Attribute
{
    public Type Constants { get; } = constants;
}
