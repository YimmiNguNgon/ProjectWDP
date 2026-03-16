// src/routes/complaints.js
const express = require("express");
const router = express.Router();
const { protectedRoute } = require("../middleware/authMiddleware");
const ctrl = require("../controller/complaintController");

// Buyer
router.post("/", protectedRoute, ctrl.createComplaint); // create complaint
router.get("/my", protectedRoute, ctrl.getMyComplaints); // list my complaints

// Seller (static first to avoid conflict with :id)
router.get("/seller/all", protectedRoute, ctrl.getSellerComplaints); // seller list
router.post("/seller/:id/handle", protectedRoute, ctrl.handleComplaintBySeller); // seller handles one

// Admin (static routes MUST come before dynamic /:id)
router.get("/admin/sent", protectedRoute, ctrl.adminGetAllFromBuyers);
router.post("/admin/:id/handle", protectedRoute, ctrl.adminHandle);
router.post("/admin/:id/resolve", protectedRoute, ctrl.adminResolveComplaint);

// Buyer actions
router.post("/:id/send-to-admin", protectedRoute, ctrl.sendToAdmin); // buyer sends to admin

// Complaint detail (dynamic) - must come LAST
router.get("/:id", protectedRoute, ctrl.getComplaintDetail);

module.exports = router;
