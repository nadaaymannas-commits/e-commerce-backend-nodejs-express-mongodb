
const mongoose = require("mongoose");
const Category = require("../model/category.model");
const SubCategory = require("../model/subCategory.model");
const Product = require("../model/product.model");
const catchAsync = require("../utilities/catchAsync.util");
const AppError = require("../utilities/appError.util");

exports.getCategories = catchAsync(async (req, res) => {
  const categories = await Category.find({
    isActive: true,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    message: "categories list",
    data: categories,
  });
});

exports.getAdminCategories = catchAsync(async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });

  res.status(200).json({
    message: "admin categories list",
    data: categories,
  });
});
exports.getCategoryById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid category ID", 400);
  }

  const myCategory = await Category.findOne({
    _id: id,
    isActive: true,
    isDeleted: false,
  });

  if (!myCategory) {
    throw new AppError("Category not found", 404);
  }

  res.status(200).json({
    message: `get category by id: ${id}`,
    data: myCategory,
  });
});

exports.addCategory = catchAsync(async (req, res) => {
  const { name } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    throw new AppError("Category name is required", 400);
  }

  const myCategory = await Category.create({
    name: name.trim(),
  });

  res.status(201).json({
    message: "category created",
    data: myCategory,
  });
});

exports.updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid category ID", 400);
  }

  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new AppError("Category name cannot be empty", 400);
    }

    updates.name = name.trim();
  }

  if (isActive !== undefined) {
    if (isActive !== true && isActive !== false &&
        isActive !== "true" && isActive !== "false") {
      throw new AppError("isActive must be true or false", 400);
    }

    updates.isActive = isActive === true || isActive === "true";
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Please provide fields to update", 400);
  }

  const myCategory = await Category.findOneAndUpdate(
    { _id: id, isDeleted: false },
    updates,
    { new: true, runValidators: true }
  );

  if (!myCategory) {
    throw new AppError("Category not found", 404);
  }

  res.status(200).json({
    message: "category updated",
    data: myCategory,
  });
});

exports.deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid category ID", 400);
  }

  const myCategory = await Category.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!myCategory) {
    throw new AppError("Category not found", 404);
  }

  const [subCategoryExists, productExists] = await Promise.all([
    SubCategory.exists({ category: id, isDeleted: false }),
    Product.exists({ category: id, isDeleted: false }),
  ]);

  if (subCategoryExists || productExists) {
    throw new AppError(
      "Cannot delete a category that has subcategories or products",
      400
    );
  }

  myCategory.isDeleted = true;
  myCategory.isActive = false;
  await myCategory.save();

  res.status(200).json({
    message: "category deleted",
  });
});
