const mongoose = require("mongoose");
const Product = require("../model/product.model");
const Category = require("../model/category.model");
const SubCategory = require("../model/subCategory.model");
const AppError = require("../utilities/appError.util");
const catchAsync = require("../utilities/catchAsync.util");
const cache = require("../utilities/cache.util.js");
const logger = require("../utilities/logger.util");

const productCacheKey = "productList";

const createSlug = (value) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};



exports.getProducts = catchAsync(async (req, res) => {
  const {
    search,
    category,
    subCategory,
    gender,
    season,
    trending,
    minPrice,
    maxPrice,
    sort = "newest",
    page = 1,
    limit = 12,
  } = req.query;

  const filter = {
    isActive: true,
    isDeleted: false,
  };

  if (search?.trim()) {
    filter.name = { $regex: search.trim(), $options: "i" };
  }

  if (category) {
    filter.category = category;
  }

  if (subCategory) {
    filter.subCategory = subCategory;
  }

  if (gender) {
    filter.gender = gender;
  }

  if (season) {
    filter.season = season;
  }

  if (trending !== undefined) {
    filter.isTrending = trending === "true";
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    priceAsc: { price: 1 },
    priceDesc: { price: -1 },
    nameAsc: { name: 1 },
  };
  const sortBy = sortOptions[sort] || sortOptions.newest;

  const [myProducts, totalProducts] = await Promise.all([
    Product.find(filter)
      .populate("category", "name")
      .populate("subCategory", "name")
      .sort(sortBy)
      .skip(skip)
      .limit(limitNumber),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    message: "products list",
    results: myProducts.length,
    totalProducts,
    currentPage: pageNumber,
    totalPages: Math.ceil(totalProducts / limitNumber),
    data: myProducts,
  });
});

exports.getProductById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid product ID", 400);
  }

  const activeCategories = await Category.find({
    isActive: true,
    isDeleted: false,
  }).distinct("_id");

  const activeSubCategories = await SubCategory.find({
    isActive: true,
    isDeleted: false,
    category: { $in: activeCategories },
  }).distinct("_id");

  const myProduct = await Product.findOne({
    _id: id,
    isActive: true,
    isDeleted: false,
    category: { $in: activeCategories },
    subCategory: { $in: activeSubCategories },
  })
    .populate("category", "name")
    .populate("subCategory", "name");

  if (!myProduct) {
    throw new AppError(`can't find product with id:${id}`, 404);
  }

  res.status(200).json({
    message: `get product by id:${id}`,
    data: myProduct,
  });
});

exports.getProductBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params;

  const activeCategories = await Category.find({
    isActive: true,
    isDeleted: false,
  }).distinct("_id");

  const activeSubCategories = await SubCategory.find({
    isActive: true,
    isDeleted: false,
    category: { $in: activeCategories },
  }).distinct("_id");

  const myProduct = await Product.findOne({
    slug,
    isActive: true,
    isDeleted: false,
    category: { $in: activeCategories },
    subCategory: { $in: activeSubCategories },
  })
    .populate("category", "name")
    .populate("subCategory", "name");

  if (!myProduct) {
    throw new AppError(`can't find product with slug:${slug}`, 404);
  }

  res.status(200).json({
    message: `get product by slug:${slug}`,
    data: myProduct,
  });
});

exports.getRelatedProducts = catchAsync(async (req, res) => {
  const { slug } = req.params;

  const activeCategories = await Category.find({
    isActive: true,
    isDeleted: false,
  }).distinct("_id");

  const activeSubCategories = await SubCategory.find({
    isActive: true,
    isDeleted: false,
    category: { $in: activeCategories },
  }).distinct("_id");

  const myProduct = await Product.findOne({
    slug,
    isActive: true,
    isDeleted: false,
    category: { $in: activeCategories },
    subCategory: { $in: activeSubCategories },
  });

  if (!myProduct) {
    throw new AppError(`can't find product with slug:${slug}`, 404);
  }

  const myProducts = await Product.find({
    slug: { $ne: slug },
    category: myProduct.category,
    subCategory: myProduct.subCategory,
    isActive: true,
    isDeleted: false,
  })
    .limit(8)
    .populate("category", "name")
    .populate("subCategory", "name");

  res.status(200).json({
    message: `related products for:${slug}`,
    data: myProducts,
  });
});
exports.addProduct = catchAsync(async (req, res) => {
  const {
    name,
    desc,
    category,
    subCategory,
    gender,
    size,
    season,
    slug,
  } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof desc !== "string" ||
    !desc.trim() ||
    req.body.price === undefined ||
    req.body.price === "" ||
    !category ||
    !subCategory ||
    !gender ||
    req.body.stock === undefined ||
    req.body.stock === ""
  ) {
    throw new AppError("Please provide all required product fields", 400);
  }

  if (!req.file) {
    throw new AppError("Product image is required", 400);
  }

  const price = Number(req.body.price);
  const stock = Number(req.body.stock);

  if (!Number.isFinite(price) || price < 0) {
    throw new AppError("Invalid product price", 400);
  }

  if (!Number.isInteger(stock) || stock < 0) {
    throw new AppError("Invalid product stock", 400);
  }

  if (!["men", "women", "unisex"].includes(gender)) {
    throw new AppError("Invalid gender", 400);
  }

  if (
    season &&
    !["summer", "winter", "spring", "autumn"].includes(season)
  ) {
    throw new AppError("Invalid season", 400);
  }

  let isTrending = false;

  if (req.body.isTrending !== undefined) {
    if (!["true", "false"].includes(req.body.isTrending)) {
      throw new AppError("Invalid trending value", 400);
    }

    isTrending = req.body.isTrending === "true";
  }

  if (
    !mongoose.isValidObjectId(category) ||
    !mongoose.isValidObjectId(subCategory)
  ) {
    throw new AppError("Invalid category or subcategory ID", 400);
  }

  const [categoryExists, subCategoryExists] = await Promise.all([
    Category.findOne({
      _id: category,
      isActive: true,
      isDeleted: false,
    }),

    SubCategory.findOne({
      _id: subCategory,
      category,
      isActive: true,
      isDeleted: false,
    }),
  ]);

  if (!categoryExists) {
    throw new AppError("Category not found or inactive", 404);
  }

  if (!subCategoryExists) {
    throw new AppError(
      "Subcategory not found, inactive, or not in this category",
      404
    );
  }

  const productSlug = createSlug(slug || name);

  if (!productSlug) {
    throw new AppError("Invalid product slug", 400);
  }

  const existingProduct = await Product.findOne({
    slug: productSlug,
  });

  if (existingProduct) {
    throw new AppError("Product slug already exists", 409);
  }

  const imgURL = `/uploads/products/${req.file.filename}`;

  const myProduct = await Product.create({
    name: name.trim(),
    desc: desc.trim(),
    price,
    imgURL,
    category,
    subCategory,
    gender,
    size,
    stock,
    season: season || undefined,
    isTrending,
    slug: productSlug,
  });

  cache.del(productCacheKey);

  logger.info(`admin:${req.user.email} created product:${myProduct._id}`);

  res.status(201).json({
    message: "product created",
    data: myProduct,
  });
});

exports.updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid product ID", 400);
  }

  const myProduct = await Product.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!myProduct) {
    throw new AppError(`can't find product with id:${id}`, 404);
  }

  const fields = [
    "name",
    "desc",
    "price",
    "category",
    "subCategory",
    "gender",
    "size",
    "stock",
    "season",
    "isActive",
    "isTrending",
    "slug",
  ];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      myProduct[field] = req.body[field];
    }
  }

  if (req.file) {
    myProduct.imgURL = `/uploads/products/${req.file.filename}`;
  }

  if (req.body.name !== undefined) {
    if (
      typeof req.body.name !== "string" ||
      !req.body.name.trim()
    ) {
      throw new AppError("Product name cannot be empty", 400);
    }

    myProduct.name = req.body.name.trim();
  }

  if (req.body.desc !== undefined) {
    if (
      typeof req.body.desc !== "string" ||
      !req.body.desc.trim()
    ) {
      throw new AppError("Description cannot be empty", 400);
    }

    myProduct.desc = req.body.desc.trim();
  }

  if (req.body.price !== undefined) {
    if (String(req.body.price).trim() === "") {
      throw new AppError("Invalid product price", 400);
    }

    myProduct.price = Number(req.body.price);
  }

  if (req.body.stock !== undefined) {
    if (String(req.body.stock).trim() === "") {
      throw new AppError("Invalid product stock", 400);
    }

    myProduct.stock = Number(req.body.stock);
  }

  if (!Number.isFinite(myProduct.price) || myProduct.price < 0) {
    throw new AppError("Invalid product price", 400);
  }

  if (
    !Number.isInteger(myProduct.stock) ||
    myProduct.stock < 0
  ) {
    throw new AppError("Invalid product stock", 400);
  }

  if (
    req.body.gender !== undefined &&
    !["men", "women", "unisex"].includes(req.body.gender)
  ) {
    throw new AppError("Invalid gender", 400);
  }

  if (
    req.body.season !== undefined &&
    !["summer", "winter", "spring", "autumn"].includes(req.body.season)
  ) {
    throw new AppError("Invalid season", 400);
  }

  for (const field of ["isActive", "isTrending"]) {
    if (req.body[field] !== undefined) {
      if (
        !["true", "false", true, false].includes(req.body[field])
      ) {
        throw new AppError(`Invalid ${field} value`, 400);
      }

      myProduct[field] =
        req.body[field] === true || req.body[field] === "true";
    }
  }

  const finalCategory = req.body.category || String(myProduct.category);
  const finalSubCategory =
    req.body.subCategory || String(myProduct.subCategory);

  if (
    !mongoose.isValidObjectId(finalCategory) ||
    !mongoose.isValidObjectId(finalSubCategory)
  ) {
    throw new AppError("Invalid category or subcategory ID", 400);
  }

  const [categoryExists, subCategoryExists] = await Promise.all([
    Category.findOne({
      _id: finalCategory,
      isActive: true,
      isDeleted: false,
    }),

    SubCategory.findOne({
      _id: finalSubCategory,
      category: finalCategory,
      isActive: true,
      isDeleted: false,
    }),
  ]);

  if (!categoryExists) {
    throw new AppError("Category not found or inactive", 404);
  }

  if (!subCategoryExists) {
    throw new AppError(
      "Subcategory not found, inactive, or not in this category",
      404
    );
  }

  if (req.body.slug !== undefined || req.body.name !== undefined) {
    myProduct.slug = createSlug(req.body.slug || myProduct.name);

    if (!myProduct.slug) {
      throw new AppError("Invalid product slug", 400);
    }
  }

  const existingProduct = await Product.findOne({
    slug: myProduct.slug,
    _id: { $ne: id },
  });

  if (existingProduct) {
    throw new AppError("Product slug already exists", 409);
  }

  await myProduct.save();

  cache.del(productCacheKey);

  logger.info(`admin:${req.user.email} updated product:${myProduct._id}`);

  res.status(200).json({
    message: "product updated",
    data: myProduct,
  });
});

exports.deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid product ID", 400);
  }

  const myProduct = await Product.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
    },
    {
      isDeleted: true,
      isActive: false,
    },
    {
      new: true,
    }
  );

  if (!myProduct) {
    throw new AppError(`can't find product with id:${id}`, 404);
  }

  cache.del(productCacheKey);

  logger.info(`admin:${req.user.email} deleted product:${myProduct._id}`);

  res.status(200).json({
    message: "product deleted",
    data: myProduct,
  });
}); 