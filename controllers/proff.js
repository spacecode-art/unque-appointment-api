import {HttpError} from "../models/error.js"
import { Availability, SLOT_STATUS } from "../models/availability.js";import { Appointment, APPOINTMENT_STATUS } from "../models/appointment.js";
import mongoose from "mongoose";
import { parseIsoDate } from "../utils/dates.js";
// Reads and validates the start/end pair used when creating or editing a slot.
// Throws an HttpError, which the controllers' catch blocks hand to the error middleware.
const readSlotTimes = (body) => {
  const startTime = parseIsoDate(body.startTime);
  const endTime = parseIsoDate(body.endTime);

  if (!startTime || !endTime) {
    throw new HttpError(
      "startTime and endTime must be ISO 8601 dates with a timezone, e.g. 2027-01-10T10:00:00Z",
      422
    );
  }
  if (startTime >= endTime) {
    throw new HttpError("Start time must be before end time", 422);
  }
  if (startTime <= new Date()) {
    throw new HttpError("A slot has to start in the future", 422);
  }
  return { startTime, endTime };
};

// Two ranges overlap when each one starts before the other ends. That single
// condition also covers one range sitting fully inside another. Booked slots
// count too: a booked hour is still an occupied hour.
const hasOverlap = (professorId, startTime, endTime, ignoreSlotId) =>
  Availability.exists({
    professorId,
    ...(ignoreSlotId && { _id: { $ne: ignoreSlotId } }),
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });

// Controller to set availability
const setAvailability = async (req, res, next) => {
  try {
    const { startTime, endTime } = readSlotTimes(req.body);

    if (await hasOverlap(req.user.id, startTime, endTime)) {
      return next(new HttpError("This overlaps a slot you already added", 409));
    }

    const slot = await Availability.create({
      professorId: req.user.id,
      startTime,
      endTime,
    });

    res.status(201).json({ message: "Availability added successfully", slot });
  } catch (error) {
    return next(error);
  }
};

const updateAvailability = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return next(new HttpError("Invalid slot ID", 400));
    }

    const { startTime, endTime } = readSlotTimes(req.body);

    // Ignore the slot itself, otherwise nudging a slot by ten minutes
    // would "overlap" with its own old timing.
    if (await hasOverlap(req.user.id, startTime, endTime, slotId)) {
      return next(new HttpError("This overlaps another slot of yours", 409));
    }

    // The filter is the whole safety check: it only matches a slot that is
    // yours and still free. Looking first and updating after would leave a
    // gap in which a student could book the slot.
    const slot = await Availability.findOneAndUpdate(
      { _id: slotId, professorId: req.user.id, status: SLOT_STATUS.FREE },
      { startTime, endTime },
      { new: true, runValidators: true }
    );

    if (!slot) {
      // No match: either not yours or doesn't exist (same answer on purpose,
      // so nobody can probe for other professors' slot ids), or already booked.
      const isYours = await Availability.exists({ _id: slotId, professorId: req.user.id });
      return next(
        isYours
          ? new HttpError("A booked slot can't be changed, cancel the appointment first", 409)
          : new HttpError("Slot not found", 404)
      );
    }

    res.status(200).json({ message: "Slot updated successfully", slot });
  } catch (error) {
    return next(error);
  }
};


const cancelAppointments = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const professorId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return next(new HttpError("Invalid student ID", 400));
    }

    const booked = await Appointment.find({
      studentId,
      professorId,
      status: APPOINTMENT_STATUS.BOOKED,
    }).select("slotId");

    if (booked.length === 0) {
      return next(new HttpError("No booked appointments found for this student", 404));
    }

    // Update by id rather than repeating the filter, so we release exactly
    // the slots that belong to the appointments we are cancelling.
    // runValidators would have caught the old "canceled" typo.
    await Appointment.updateMany(
      { _id: { $in: booked.map((appointment) => appointment._id) } },
      { status: APPOINTMENT_STATUS.CANCELLED },
      { runValidators: true }
    );
    await Availability.updateMany(
      { _id: { $in: booked.map((appointment) => appointment.slotId) } },
      { status: SLOT_STATUS.FREE }
    );

    res.status(200).json({ message: "Appointments cancelled", cancelled: booked.length });
  } catch (error) {
    return next(error);
  }
};
export { setAvailability, updateAvailability, cancelAppointments };