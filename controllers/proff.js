import {HttpError} from "../models/error.js"
import {Availability} from "../models/availability.js"
import { Appointment } from "../models/appointment.js";
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



  const cancelAppointments = async(req,res,next) => {
    try {
      const { studentId } = req.params;  // Student's ID from params
      const professorId = req.user.id;   // Professor's ID from the authenticated user
      console.log('Professor ID:', professorId);  // This should match the professor's ID in the appointment
      console.log('Student ID:', studentId);

      // Ensuring professor is authenticated and studentId is provided
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return next(new HttpError("Invalid or missing student ID", 400));
      }
  
      // Finding the  appointments between this professor and student
      const appointments = await Appointment.find({
        studentId: new mongoose.Types.ObjectId(studentId),
        professorId: new mongoose.Types.ObjectId(professorId),
        status: 'booked' // Only cancel booked appointments
      });
  
      if (!appointments || appointments.length === 0) {
        return next(new HttpError("No appointments found to cancel", 404));
      }
  
      // Updating the status of all appointments to "canceled"
      await Appointment.updateMany(
        {
          studentId: new mongoose.Types.ObjectId(studentId),
          professorId: new mongoose.Types.ObjectId(professorId),
          status: 'booked'
        },
        { status: 'canceled' }  //  the status  needs to be canceled
      );
  
      res.status(200).json({
        message: `All appointments between professor ${professorId} and student ${studentId} have been canceled.,`
      });
  
    } catch (error) {
      return next(error);
    }
  };
export {setAvailability, cancelAppointments};