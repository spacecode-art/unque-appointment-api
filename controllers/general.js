import { Availability, SLOT_STATUS } from "../models/availability.js";
import { HttpError } from "../models/error.js";
import { User } from "../models/user.js";
import { Appointment, APPOINTMENT_STATUS } from "../models/appointment.js";
import mongoose from 'mongoose';
  

const getAvailableSlots = async (req, res, next) => {
    try {
        const { professorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(professorId)) {
            return next(new HttpError("Invalid professor ID format", 400));
        }

        const professor = await User.exists({ _id: professorId, role: "professor" });
        if (!professor) {
            return next(new HttpError("Professor not found", 404));
        }

        const availableSlots = await Availability.find({
            professorId,
            status: "free",
            startTime: { $gt: new Date() },
        }).sort({ startTime: 1 });

        // No free slots is a normal state, not an error
        res.status(200).json({ professorId, availableSlots });
    } catch (error) {
        return next(error);
    }
};

const bookAppointment = async (req, res, next) => {
  try {
    const { slotId } = req.body;
    const studentId = req.user.id;

    // A string check, not just isValid: it keeps objects like {"$ne": null}
    // from reaching the query as operators.
    if (typeof slotId !== "string" || !mongoose.Types.ObjectId.isValid(slotId)) {
      return next(new HttpError("A valid slotId is required", 400));
    }

    // Claim the slot in one atomic step. The database lets only one request
    // flip a slot from free to booked, so two students can't both get it.
    const slot = await Availability.findOneAndUpdate(
      { _id: slotId, status: SLOT_STATUS.FREE, startTime: { $gt: new Date() } },
      { status: SLOT_STATUS.BOOKED },
      { new: true }
    );

    if (!slot) {
      const exists = await Availability.exists({ _id: slotId });
      return next(
        exists
          ? new HttpError("This slot is no longer available", 409)
          : new HttpError("Slot not found", 404)
      );
    }

    let appointment;
    try {
      appointment = await Appointment.create({
        studentId,
        professorId: slot.professorId,
        slotId: slot._id,
        time: slot.startTime,
      });
    } catch (error) {
      // Don't leave the slot stuck as booked if we couldn't save the booking
      await Availability.updateOne({ _id: slot._id }, { status: SLOT_STATUS.FREE });
      throw error;
    }

    res.status(201).json({ message: "Appointment booked successfully", appointment });
  } catch (error) {
    return next(error);
  }
};


  const getStudentAppointments = async (req, res, next) => {
    try {
      const studentId = req.user.id;  // Extract the student ID from the token (from authMiddleware)
      console.log("studentId from token:", studentId);
      console.log("Querying database with studentId:", new mongoose.Types.ObjectId(studentId));
       // debugging the id
      // Fetch all booked appointments for the student
      const appointments = await Appointment.find({
        studentId:new mongoose.Types.ObjectId(studentId),
        status: 'booked',  // Only show booked appointments
      }).populate('professorId', 'name');  // Populate professor's name in the response
        console.log(appointments);
      if (!appointments || appointments.length === 0) {
        return next(new HttpError("You have no pending appointments", 404));
      }
  
      // Format the response to show the appointment details and times
      const formattedAppointments = appointments.map(appointment => ({
        professor: appointment.professorId.name,  // Show professor's name
        appointmentTime: moment.utc(appointment.time).format('MMMM Do YYYY, h:mm:ss a'),  // Format time with moment.js
        status: appointment.status,
      }));
  
      res.status(200).json({
        message: "Your upcoming appointments:",
        appointments: formattedAppointments,
      });
  
    } catch (error) {
      console.error("Error fetching appointments:", error);
      return next(new HttpError("Failed to retrieve appointments", 500));
    }
  };

export { getAvailableSlots, bookAppointment, getStudentAppointments };