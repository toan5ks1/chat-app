import { Schema, model, Document, Model } from 'mongoose';

export interface IUser extends Document {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String }
  },
  {
    timestamps: true
  }
);

export const User: Model<IUser> = model<IUser>('User', userSchema);
