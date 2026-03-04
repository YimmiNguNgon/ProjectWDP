const express = require("express");
const banAppealController = require("../controller/banAppealController");

const router = express.Router();

router.get("/verify", banAppealController.verifyToken);
router.post("/submit", banAppealController.submitAppeal);

module.exports = router;
