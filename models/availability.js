import mongoose from "mongoose";

export const SLOT_STATUS = { FREE: "free", BOOKED: "booked" };

const availabilitySchema = new mongoose.Schema(
  {
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    // A slot stays free until a student books it
    status: {
      type: String,
      enum: Object.values(SLOT_STATUS),
      default: SLOT_STATUS.FREE,
    },
  },
  { timestamps: true }
);

// Every slot query starts from one professor and filters by time
availabilitySchema.index({ professorId: 1, startTime: 1 });

// Send "id" instead of "_id", and drop __v
availabilitySchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

const Availability = mongoose.model("Availability", availabilitySchema);
export { Availability };
