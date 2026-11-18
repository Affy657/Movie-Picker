using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace MoviePicker.Api.Infrastructure.Web;

[AttributeUsage(AttributeTargets.Parameter)]
public sealed class CurrentUserIdAttribute : Attribute, IBinderTypeProviderMetadata
{
    public BindingSource BindingSource => BindingSource.Special;

    public Type BinderType => typeof(CurrentUserIdModelBinder);
}

public sealed class CurrentUserIdModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var user = bindingContext.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true || !user.TryGetUserId(out var userId))
            throw new MissingUserIdentityException();

        bindingContext.Result = ModelBindingResult.Success(userId);
        return Task.CompletedTask;
    }
}

public sealed class MissingUserIdentityException : Exception
{
    public MissingUserIdentityException()
        : base("The request carries no signed-in user id")
    {
    }
}
