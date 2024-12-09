const router = require("express").Router();
const Request = require("../models/requestsModel");
const authMiddleware = require("../middlewares/authMiddleware");
const User = require("../models/userModel");
const Transaction = require("../models/transactionModel");

// Get all requests for a user
router.post("/get-all-requests-by-user", authMiddleware, async (req, res) => {
  try {
    const requests = await Request.find({
      $or: [{ sender: req.body.userId }, { receiver: req.body.userId }],
    })
      .populate("sender")
      .populate("receiver")
      .sort({ createdAt: -1 });

    res.send({
      data: requests,
      message: "Requests fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ error: error.message, success: false });
  }
});

// Send a request to another user
router.post("/send-request", authMiddleware, async (req, res) => {
  try {
    const { receiver, amount, description } = req.body;
    const request = new Request({
      sender: req.body.userId, // Correctly using req.user._id
      receiver,
      amount,
      description,
    });
    await request.save();
    res.send({
      data: request,
      message: "Request sent successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error sending request:", error);
    res.status(500).json({ error: error.message, success: false });
  }
});

//update a request status
router.post("/update-request-status", authMiddleware, async (req, res) => {
  try {
    if (req.body.status === "accepted") {
      //create transaction
      const transaction = new Transaction({
        sender: req.body.receiver._id,
        receiver: req.body.sender._id,
        amount: req.body.amount,
        reference: req.body.description,
        status: "success",
      });
      await transaction.save();
      // Deduct the amount from the sender
      await User.findByIdAndUpdate(req.body.sender._id, {
        $inc: { balance: req.body.amount },
      });

      // Add the amount to the receiver
      await User.findByIdAndUpdate(req.body.receiver._id, {
        $inc: { balance: -req.body.amount },
      });

      // Update the request status
      await Request.findByIdAndUpdate(req.body._id, {
        status: req.body.status,
      });
    }

    res.send({
      data: null,
      message: "Request status updated successfully",
      success: true,
    });
  } catch (error) {
    res.send({
      data: error.message, // Send error message for debugging
      message: "Request status not updated successfully",
      success: false,
    });
  }
});

module.exports = router;
