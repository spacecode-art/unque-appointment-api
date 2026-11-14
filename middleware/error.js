import { HttpError } from "../models/error.js";

export const notFound = (req, res, next) => {
  next(new HttpError(`Not Found - ${req.originalUrl}`, 404));
};

// Express only treats a function as an error handler if it takes four
// arguments, so `next` has to stay in the signature even though we skip it.
export const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Our own HttpErrors and body-parser's 4xx errors (bad JSON, for example)
  // are safe to show. Anything else is a surprise: log it, don't leak it.
  const known = err instanceof HttpError || err.expose === true;
  const statusCode = known ? err.statusCode || 500 : 500;

  if (!known) {
    console.error(err);
  }

  res.status(statusCode).json({
    message: known ? err.message : "Something went wrong on our side",
  });
};
