const logger = require("../utilities/logger.util");
module.exports = (err, req, res, next) => {
  logger.error(`${err.message}`);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV == "development") {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
    });
  } else {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      return res.status(err.statusCode).json({
        status: 500,

        message: "Something went wrong",
      });
    }
  }
};
