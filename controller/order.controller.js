const mongoose = require("mongoose");
const Order = require("../model/order.model");
const Product = require("../model/product.model");
const catchAsync = require("../utilities/catchAsync.util");
const AppError = require("../utilities/appError.util");

const SHIPPING_FEES = {
  cairo: 60,
  giza: 60,
  القاهرة: 60,
  الجيزة: 60,
};

exports.createOrder = catchAsync(async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Order must contain at least one product", 400);
  }

  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw new AppError("Shipping address is required", 400);
  }

  const requiredAddressFields = [
    "governorate",
    "city",
    "street",
    "building",
    "phone",
  ];

  for (const field of requiredAddressFields) {
    if (
      typeof shippingAddress[field] !== "string" ||
      !shippingAddress[field].trim()
    ) {
      throw new AppError(`Shipping address ${field} is required`, 400);
    }
  }

  const governorate = shippingAddress.governorate.trim().toLowerCase();
  const shippingPrice = SHIPPING_FEES[governorate];

  if (shippingPrice === undefined) {
    throw new AppError(
      "Shipping fee is not configured for this governorate yet",
      400,
    );
  }

  const combinedItems = new Map();

  for (const item of items) {
    if (!item || !mongoose.isValidObjectId(item.product)) {
      throw new AppError("Invalid product ID", 400);
    }

    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new AppError("Quantity must be a positive integer", 400);
    }

    const size = typeof item.size === "string" ? item.size.trim() : "";
    const key = `${item.product}_${size}`;

    if (combinedItems.has(key)) {
      combinedItems.get(key).quantity += quantity;
    } else {
      combinedItems.set(key, {
        productId: item.product,
        quantity,
        size,
      });
    }
  }

  const requestedItems = Array.from(combinedItems.values());
  const orderItems = [];
  const reservedItems = [];
  let itemsPrice = 0;

  for (const item of requestedItems) {
    const product = await Product.findOne({
      _id: item.productId,
      isActive: true,
      isDeleted: false,
    });

    if (!product) {
      throw new AppError(`Product ${item.productId} is not available`, 404);
    }

    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    const subtotal = product.price * item.quantity;
    itemsPrice += subtotal;

    orderItems.push({
      product: product._id,
      name: product.name,
      imgURL: product.imgURL,
      price: product.price,
      quantity: item.quantity,
      size: item.size,
      subtotal,
    });
  }

  try {
    for (const item of requestedItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          isActive: true,
          isDeleted: false,
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        },
        { new: true },
      );

      if (!updatedProduct) {
        throw new AppError(
          "Stock changed during checkout. Please try again",
          409,
        );
      }

      reservedItems.push(item);
    }

    const totalPrice = itemsPrice + shippingPrice;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: {
        governorate: shippingAddress.governorate.trim(),
        city: shippingAddress.city.trim(),
        street: shippingAddress.street.trim(),
        building: shippingAddress.building.trim(),
        floor: shippingAddress.floor || "",
        apartment: shippingAddress.apartment || "",
        phone: shippingAddress.phone.trim(),
      },
      paymentMethod: "cashOnDelivery",
      itemsPrice,
      shippingPrice,
      totalPrice,
    });

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    for (const item of reservedItems) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } },
      );
    }

    throw error;
  }
});

exports.getMyOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: orders,
  });
});

exports.getOrderById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid order ID", 400);
  }

  const order = await Order.findById(id).populate("user", "name email");

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const isOwner = order.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("You are not allowed to view this order", 403);
  }

  res.status(200).json({
    status: "success",
    data: order,
  });
});

exports.getAllOrders = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    !Number.isInteger(limitNumber) ||
    limitNumber < 1 ||
    limitNumber > 100
  ) {
    throw new AppError("Invalid pagination values", 400);
  }

  const filter = {};

  const allowedStatuses = [
    "pending",
    "shipped",
    "delivered",
    "received",
    "canceled",
    "rejected",
    "refunded",
  ];

  if (status !== undefined) {
    if (!allowedStatuses.includes(status)) {
      throw new AppError("Invalid order status", 400);
    }

    filter.status = status;
  }

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: orders.length,
    totalOrders,
    currentPage: pageNumber,
    totalPages: Math.ceil(totalOrders / limitNumber),
    data: orders,
  });
});

exports.updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid order ID", 400);
  }

  const allowedStatuses = [
    "shipped",
    "delivered",
    "received",
    "rejected",
    "refunded",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new AppError("Invalid order status", 400);
  }

  const order = await Order.findById(id);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (["canceled", "rejected", "refunded", "received"].includes(order.status)) {
    throw new AppError("This order can no longer be updated", 400);
  }

  if (order.status === "delivered" && status !== "received") {
    throw new AppError("A delivered order can only be marked as received", 400);
  }

  if (status === "received" && order.status !== "delivered") {
    throw new AppError("Only delivered orders can be marked as received", 400);
  }

  order.status = status;

  if (status === "delivered") {
    order.deliveredAt = new Date();
  }

  if (status === "received") {
    order.receivedAt = new Date();
  }

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order status updated successfully",
    data: order,
  });
});

exports.cancelOrder = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid order ID", 400);
  }

  const order = await Order.findById(id);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const isOwner = order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("You are not allowed to cancel this order", 403);
  }

  if (order.status !== "pending" && !(isAdmin && order.status === "shipped")) {
    throw new AppError("This order can no longer be canceled", 400);
  }

  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
    );
  }

  order.status = "canceled";
  order.canceledBy = isAdmin ? "admin" : "client";
  order.cancelReason =
    typeof req.body.reason === "string" ? req.body.reason.trim() : "";

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order canceled successfully",
    data: order,
  });
});
