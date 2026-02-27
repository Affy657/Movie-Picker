import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IParticipantDoc extends Document {
  eventId: mongoose.Types.ObjectId;
  pseudo: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipantDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    pseudo: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ParticipantSchema.index({ eventId: 1, pseudo: 1 }, { unique: true });

export const Participant: Model<IParticipantDoc> = mongoose.model<IParticipantDoc>(
  'Participant',
  ParticipantSchema
);
