const mongoose = require("mongoose");

const Testimonial = require("../model/Testimonial.model");
const Product = require("../model/product.model");
const Order = require("../model/order.model");

const catchAsync = require("../utilities/catchAsync.util");
const AppError = require("../utilities/appError.util");

exports.getTestimonials = catchAsync(async (req, res) => {
  const filter = { status: "approved" };

  if (req.query.product) {
    if (!mongoose.isValidObjectId(req.query.product)) {
      throw new AppError("Invalid product ID", 400);
    }

    filter.product = req.query.product;
  }

  const testimonials = await Testimonial.find(filter)
    .populate("user", "name")
    .populate("product", "name imgURL slug")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: testimonials.length,
    data: { testimonials },
  });
});

exports.createTestimonial = catchAsync(async (req, res) => {
  const { product, rating, comment } = req.body;

  if (!mongoose.isValidObjectId(product)) {
    throw new AppError("Valid product ID is required", 400);
  }

  const numericRating = Number(rating);

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    throw new AppError("Rating must be an integer from 1 to 5", 400);
  }

  if (
    typeof comment !== "string" ||
    comment.trim().length < 3 ||
    comment.trim().length > 1000
  ) {
    throw new AppError("Comment must be between 3 and 1000 characters", 400);
  }

  const existingProduct = await Product.findOne({
    _id: product,
    isDeleted: false,
    isActive: true,
  });

  if (!existingProduct) {
    throw new AppError("Product not found", 404);
  }

  const hasPurchased = await Order.exists({
    user: req.user._id,
    status: { $in: ["delivered", "received"] },
    "items.product": product,
  });

  if (!hasPurchased) {
    throw new AppError(
      "You can review a product only after purchasing and receiving it",
      403,
    );
  }

  const existingTestimonial = await Testimonial.findOne({
    user: req.user._id,
    product,
  });

  if (existingTestimonial) {
    throw new AppError(
      "You have already submitted a review for this product",
      409,
    );
  }

  const testimonial = await Testimonial.create({
    user: req.user._id,
    product,
    rating: numericRating,
    comment: comment.trim(),
  });

  res.status(201).json({
    status: "success",
    message: "Your review has been submitted for admin approval",
    data: { testimonial },
  });
});

exports.getAllTestimonials = catchAsync(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    const allowedStatuses = ["pending", "approved", "rejected"];

    if (!allowedStatuses.includes(req.query.status)) {
      throw new AppError("Invalid testimonial status", 400);
    }

    filter.status = req.query.status;
  }

  const testimonials = await Testimonial.find(filter)
    .populate("user", "name email")
    .populate("product", "name imgURL slug")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: testimonials.length,
    data: { testimonials },
  });
});

exports.updateTestimonialStatus = catchAsync(async (req, res) => {
  const { status, adminReply } = req.body;

  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError("Invalid testimonial ID", 400);
  }

  if (!["approved", "rejected"].includes(status)) {
    throw new AppError("Status must be approved or rejected", 400);
  }

  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    throw new AppError("Testimonial not found", 404);
  }

  testimonial.status = status;

  if (adminReply !== undefined) {
    if (typeof adminReply !== "string" || adminReply.length > 500) {
      throw new AppError("Admin reply must not exceed 500 characters", 400);
    }

    testimonial.adminReply = adminReply.trim();
  }

  await testimonial.save();

  res.status(200).json({
    status: "success",
    message: `Testimonial ${status} successfully`,
    data: { testimonial },
  });
});
