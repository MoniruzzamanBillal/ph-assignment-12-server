const router = require("express").Router();

router.get("/parcels", async (req, res) => {
  res.send({ message: "all parcels are given " });
});

module.exports = router;
