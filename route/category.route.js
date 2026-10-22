const express = require("express");
const router = express.Router();

const {
  getCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  getAdminCategories,
} = require("../controller/category.controller");

const { authanicate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.get("/", getCategories);
router.get("/admin/all", authanicate, authorize("admin"), getAdminCategories);
router.get("/:id", getCategoryById);
router.post("/", authanicate, authorize("admin"), addCategory);
router.put("/:id", authanicate, authorize("admin"), updateCategory);
router.delete("/:id", authanicate, authorize("admin"), deleteCategory);

module.exports = router; 