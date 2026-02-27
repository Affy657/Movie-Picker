import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMovieDoc extends Document {
  eventId: mongoose.Types.ObjectId;
  participantId: mongoose.Types.ObjectId;
  tmdbId: number;
  title: string;
  year: string;
  posterPath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MovieSchema = new Schema<IMovieDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    tmdbId: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    year: { type: String, required: true },
    posterPath: { type: String, default: null },
  },
  { timestamps: true }
);

MovieSchema.index({ eventId: 1, tmdbId: 1 }, { unique: true });
MovieSchema.index({ eventId: 1, title: 1 });

export const Movie: Model<IMovieDoc> = mongoose.model<IMovieDoc>('Movie', MovieSchema);
