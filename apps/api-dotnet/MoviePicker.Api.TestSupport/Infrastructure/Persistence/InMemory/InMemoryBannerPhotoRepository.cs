using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryBannerPhotoRepository(TimeProvider? clock = null) : InMemoryPhotoBlobRepository(clock), IBannerPhotoRepository;
