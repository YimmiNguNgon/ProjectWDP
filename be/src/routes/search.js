const express = require("express");
const router = express.Router();
const searchCtrl = require("../controller/searchController");

router.get("/products", searchCtrl.searchProducts);

router.get("/sellers", searchCtrl.searchSellers);

router.get("/", searchCtrl.globalSearch);

module.exports = router;
