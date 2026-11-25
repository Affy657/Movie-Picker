using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAvatarPhotoRepository : InMemoryPhotoBlobRepository, IAvatarPhotoRepository;
