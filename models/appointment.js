import mongoose from "mongoose";

// Used everywhere instead of bare strings. A typo like "canceled" vs
// "cancelled" was already hiding in this codebase.
export const APPOINTMENT_STATUS = {
  BOOKED: "booked",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const appointmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The slot this booking claimed. Cancelling releases it again.
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Availability",
      required: true,
    },
    // Copied from the slot when booked. Only free slots can be edited, so this
    // can never drift away from the slot's startTime.
    time: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.BOOKED,
    },
  },
  { timestamps: true }
);

// Serves "my booked appointments" and "cancel everything with this student"
appointmentSchema.index({ studentId: 1, status: 1 });

appointmentSchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export { Appointment };