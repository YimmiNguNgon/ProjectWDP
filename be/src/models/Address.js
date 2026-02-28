const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },

    country: String,
    city: String,
    district: String,
    ward: String,
    street: String,

    detail: {
      type: String,
      maxlength: 500,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Address", addressSchema);
