const User = require("../model/user.model");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utilities/catchAsync.util");
const AppError = require("../utilities/appError.util");

const signinToken = (myUser) => {
  const { _id, role, name } = myUser;
  return jwt.sign({ _id, role, name }, process.env.SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRIES_IN,
  });
};

exports.register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Please provide name, email and password", 400);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({
    email: normalizedEmail,
  });
  if (existingUser) {
    throw new AppError("Email alreaady exists", 409);
  }
  const myUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: password,
  });

  const token = signinToken(myUser);
  res.status(201).json({
    message: "User registered successfully",
    data: token,
    user: {
      id: myUser._id,
      name: myUser.name,
      email: myUser.email,
      role: myUser.role,
    },
  });
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError("Please provide email and password", 400);
  }
  const myUser = await User.findOne({
    email: email.trim().toLowerCase(),
  });
  if (!myUser) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!(await myUser.isCorrectPassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }
  const token = signinToken(myUser);

  res.status(200).json({
    message: "You logged in successfully",
    data: token,
    user: {
      id: myUser._id,
      name: myUser.name,
      email: myUser.email,
      role: myUser.role,
    },
  });
});
