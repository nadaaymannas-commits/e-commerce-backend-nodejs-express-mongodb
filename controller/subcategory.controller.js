const mongoose = require("mongoose");
const AppError = require("../utilities/appError.util");
const Product = require("../model/product.model");
const Category = require("../model/category.model");
const SubCategory = require("../model/subCategory.model");
const catchAsync = require("../utilities/catchAsync.util");
const cache = require("../utilities/cache.util.js");
const logger = require("../utilities/logger.util");

const productCacheKey = "productList";

exports.getSubCategories = catchAsync(async (req, res) => {
  const filter = {
    isActive: true,
    isDeleted: false,
  };

  if (req.query.category) {
    if (!mongoose.isValidObjectId(req.query.category)) {
      throw new AppError("Invalid category ID", 400);
    }

    filter.category = req.query.category;
  }

  const mySubCategories = await SubCategory.find(filter)
    .populate({
      path: "category",
      match: {
        isActive: true,
        isDeleted: false,
      },
      select: "name",
    })
    .sort({ createdAt: -1 });

  const activeSubCategories = mySubCategories.filter(
    (subCategory) => subCategory.category
  );

  res.status(200).json({
    message: "subcategories list",
    results: activeSubCategories.length,
    data: activeSubCategories,
  });
});

exports.getAdminSubCategories = catchAsync(async (req, res) => {
  const mySubCategories = await SubCategory.find()
    .populate("category", "name isActive isDeleted")
    .sort({ createdAt: -1 });

  res.status(200).json({
    message: "admin subcategories list",
    results: mySubCategories.length,
    data: mySubCategories,
  });
});

exports.getSubCategoryById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid subcategory ID", 400);
  }

  const mySubCategory = await SubCategory.findOne({
    _id: id,
    isActive: true,
    isDeleted: false,
  }).populate("category", "name");

  if (!mySubCategory || !mySubCategory.category ||
      !mySubCategory.category.isActive ||
      mySubCategory.category.isDeleted) {
    throw new AppError("Subcategory not found", 404);
  }

  res.status(200).json({
    message: "subcategory details",
    data: mySubCategory,
  });
});

exports.addSubCategory = catchAsync(async (req, res) => {
  const { name, category } = req.body;

  if (typeof name !== "string" || !name.trim() || !category) {
    throw new AppError("Please provide name and category", 400);
  }

  if (!mongoose.isValidObjectId(category)) {
    throw new AppError("Invalid category ID", 400);
  }

  const categoryExists = await Category.findOne({
    _id: category,
    isActive: true,
    isDeleted: false,
  });

  if (!categoryExists) {
    throw new AppError("Category not found or inactive", 404);
  }

  const mySubCategory = await SubCategory.create({
    name: name.trim(),
    category,
    isActive: req.body.isActive === undefined
      ? true
      : req.body.isActive === true || req.body.isActive === "true",
    isDeleted: false,
  });

  cache.del(productCacheKey);

  logger.info(`admin created subcategory:${mySubCategory._id}`);

  res.status(201).json({
    message: "subcategory created",
    data: mySubCategory,
  });
});

exports.updateSubCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid subcategory ID", 400);
  }

  const mySubCategory = await SubCategory.findById(id);

  if (!mySubCategory) {
    throw new AppError("Subcategory not found", 404);
  }

  if (req.body.name !== undefined) {
    if (typeof req.body.name !== "string" || !req.body.name.trim()) {
      throw new AppError("Subcategory name cannot be empty", 400);
    }

    mySubCategory.name = req.body.name.trim();
  }

  if (req.body.category !== undefined) {
    if (!mongoose.isValidObjectId(req.body.category)) {
      throw new AppError("Invalid category ID", 400);
    }

    const categoryExists = await Category.findOne({
      _id: req.body.category,
      isActive: true,
      isDeleted: false,
    });

    if (!categoryExists) {
      throw new AppError("Category not found or inactive", 404);
    }

    mySubCategory.category = req.body.category;
  }

  for (const field of ["isActive", "isDeleted"]) {
    if (req.body[field] !== undefined) {
      if (!["true", "false", true, false].includes(req.body[field])) {
        throw new AppError(`Invalid ${field} value`, 400);
      }

      mySubCategory[field] =
        req.body[field] === true || req.body[field] === "true";
    }
  }

  if (mySubCategory.isDeleted) {
    mySubCategory.isActive = false;
  }

  if (mySubCategory.isActive && mySubCategory.isDeleted) {
    throw new AppError("Deleted subcategory cannot be active", 400);
  }

  await mySubCategory.save();

  cache.del(productCacheKey);

  logger.info(`admin updated subcategory:${mySubCategory._id}`);

  res.status(200).json({
    message: "subcategory updated",
    data: mySubCategory,
  });
});

exports.deleteSubCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid subcategory ID", 400);
  }

  const mySubCategory = await SubCategory.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!mySubCategory) {
    throw new AppError("Subcategory not found", 404);
  }

  const productsExists = await Product.exists({
    subCategory: id,
    isDeleted: false,
  });

  if (productsExists) {
    throw new AppError(
      "Cannot delete subcategory because it has products",
      400
    );
  }

  mySubCategory.isDeleted = true;
  mySubCategory.isActive = false;

  await mySubCategory.save();

  cache.del(productCacheKey);

  logger.info(`admin deleted subcategory:${mySubCategory._id}`);

  res.status(200).json({
    message: "subcategory deleted",
    data: mySubCategory,
  });
});
