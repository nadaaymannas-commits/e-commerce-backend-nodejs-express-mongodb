const {
  getProducts,
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("../controller/product.controller");
const express = require("express");
const router = express.Router();
const { upload } = require("../middlewares/upload.middleware");
const { authanicate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { updateProductPrice } = require("../controller/product.controller");

router.get("/", getProducts);
router.patch("/:id/price", authanicate, authorize("admin"), updateProductPrice);
router.get("/id/:id", getProductById);
router.get("/related-products/:slug", getRelatedProducts);
router.get("/:slug", getProductBySlug);
router.post(
  "/",
  authanicate,
  authorize("admin"),
  upload.single("imgURL"),
  addProduct,
);
router.put(
  "/:id",
  authanicate,
  authorize("admin"),
  upload.single("imgURL"),
  updateProduct
);
router.delete(
  "/:id",
  authanicate,
  authorize("admin"),
  deleteProduct
);
module.exports = router;



