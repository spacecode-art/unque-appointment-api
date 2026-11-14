import {HttpError} from "../models/error.js"
import { Availability, SLOT_STATUS } from "../models/availability.js";import { Appointment, APPOINTMENT_STATUS } from "../models/appointment.js";
import mongoose from "mongoose";
import { parseIsoDate } from "../utils/dates.js";

// Controller to set availability
const setAvailability = async (req, res, next) => {
  try {
    const startTime = parseIsoDate(req.body.startTime);
    const endTime = parseIsoDate(req.body.endTime);

    if (!startTime || !endTime) {
      return next(
        new HttpError(
          "startTime and endTime must be ISO 8601 dates with a timezone, e.g. 2027-01-10T10:00:00Z",
          422
        )
      );
    }
    if (startTime >= endTime) {
      return next(new HttpError("Start time must be before end time", 422));
    }
    if (startTime <= new Date()) {
      return next(new HttpError("A slot has to start in the future", 422));
    }

    // Two ranges overlap when each one starts before the other ends.
    // That single condition also covers one range sitting fully inside another.
    const overlapping = await Availability.exists({
      professorId: req.user.id,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });
    if (overlapping) {
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
export {setAvailability, cancelAppointments};