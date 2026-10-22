const express = require("express");
const router = express.Router();
const {
  getSubCategories,
  getSubCategoryById,
  addSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getAdminSubCategories,
} = require("../controller/subcategory.controller");
const { authanicate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.get("/", getSubCategories);
router.get("/admin/all", authanicate, authorize("admin"), getAdminSubCategories);
router.get("/:id", getSubCategoryById);
router.post("/", authanicate, authorize("admin"), addSubCategory);
router.put("/:id", authanicate, authorize("admin"), updateSubCategory);
router.delete("/:id", authanicate, authorize("admin"), deleteSubCategory);

module.exports = router;