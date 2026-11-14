import { HttpError } from "../models/error.js";  
import { User } from "../models/user.js";        
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import { env } from "../config/env.js";
import mongoose from "mongoose";
// User Registration Controller
const SALT_ROUNDS = 11;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores everything past 72 bytes
const ROLES = ["student", "professor"];

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    if (![name, email, password, role].every(isNonEmptyString)) {
      return next(new HttpError("Fill in all the fields", 422));
    }
    if (!ROLES.includes(role)) {
      return next(new HttpError("Role must be student or professor", 422));
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return next(
        new HttpError(
          `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
          422
        )
      );
    }
    if (password !== confirmPassword) {
      return next(new HttpError("Passwords do not match", 422));
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    // The unique index on email is what actually guarantees no duplicates.
    // The old findOne-then-create check could let two simultaneous requests
    // both pass, so we let the database decide and translate its error.
    if (error.code === 11000) {
      return next(new HttpError("Email already exists", 409));
    }
    return next(error);
  }
};
// Compared against when the email isn't registered, so a wrong email takes
// as long as a wrong password and response time can't be used to find out
// which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return next(new HttpError("Fill in all fields", 422));
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_HASH
    );

    if (!user || !passwordMatches) {
      return next(new HttpError("Invalid email or password", 401));
    }

    const { _id: id, name, role } = user;
    const token = jwt.sign({ id, name, role }, env.jwtSecret, {
      algorithm: "HS256",
      expiresIn: "2d",
    });
    res.status(200).json({ token, id, name, role });
  } catch (error) {
    return next(error);
  }
};
const getUserProfile = async(req,res,next) => {
  try {
   // extracting the id
    const {id} = req.params;
    const user = await User.findById(id).select('-password'); // don't send the password back
    if(!user) {
     return next(new HttpError("User not found", 422));
    }
res.status(200).json(user);
} catch(error) {
 return next(error);
  }
}

export { register, login , getUserProfile};  
