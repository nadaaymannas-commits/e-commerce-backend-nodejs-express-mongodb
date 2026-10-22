const express = require("express");
const router = express.Router();

const {
  getTestimonials,
  createTestimonial,
  getAllTestimonials,
  updateTestimonialStatus,
} = require("../controller/testimonial.controller");

const { authanicate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.get("/", getTestimonials);

router.post("/", authanicate, createTestimonial);

router.get(
  "/admin",
  authanicate,
  authorize("admin"),
  getAllTestimonials
);

router.patch(
  "/:id/status",
  authanicate,
  authorize("admin"),
  updateTestimonialStatus
);

module.exports = router;