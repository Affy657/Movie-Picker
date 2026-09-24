using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

[AttributeUsage(AttributeTargets.Property)]
public sealed class NoEmptyItemsAttribute : ValidationAttribute
{
    public NoEmptyItemsAttribute()
        : base("The list must not contain an empty item")
    {
    }

    public override bool IsValid(object? value) =>
        value is not IEnumerable items || items.Cast<object?>().All(item => item is not null);
}
