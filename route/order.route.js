const express = require("express");
const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require("../controller/order.controller");

const { authanicate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.post("/", authanicate, createOrder);
router.get("/my-orders", authanicate, getMyOrders);
router.get("/:id", authanicate, getOrderById);
router.patch("/:id/cancel", authanicate, cancelOrder);

router.get("/", authanicate, authorize("admin"), getAllOrders);
router.patch(
  "/:id/status",
  authanicate,
  authorize("admin"),
  updateOrderStatus
);

module.exports = router;