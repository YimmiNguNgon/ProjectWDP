const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../controller/chatController");

router.get("/conversations", auth, ctrl.listConversations);
router.get("/conversations/:id", auth, ctrl.getConversation);
router.get("/conversations/:id/messages", auth, ctrl.getMessages);
router.post("/conversations", auth, ctrl.createConversation);
router.delete("/conversations/:id", auth, ctrl.deleteConversation);
router.post("/conversations/:id/read", auth, ctrl.markRead);
router.post("/conversations/:id/archive", auth, ctrl.archiveConversation);
router.post("/conversations/:id/inbox", auth, ctrl.moveToInbox);

// Chat moderation
router.post("/conversations/:id/flag", auth, ctrl.flagConversation);
router.get("/admin/flagged", auth, ctrl.adminGetFlaggedConversations);
router.post("/admin/:id/unflag", auth, ctrl.adminUnflagConversation);

module.exports = router;
