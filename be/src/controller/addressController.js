const Address = require("../models/Address.js");
const User = require("../models/User.js");

exports.createAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const data = req.body;

    if (!data.fullName || !data.phone) {
      return res
        .status(400)
        .json({ message: "Fullname and phone are required" });
    }

    const count = await Address.countDocuments({ user: userId });

    if (count === 0) {
      data.isDefault = true;
    }

    if (data.isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    await Address.create({
      ...data,
      user: userId,
    });

    return res.status(201).json({ message: "Create Address Successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getAddresses = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const addresses = await Address.find({ user: userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return res
      .status(200)
      .json({ message: "Get Address Successfully", data: addresses });
  } catch (error) {
    next(error);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const data = req.body;

    const address = await Address.findOne({ _id: id, user: userId });

    if (!address) return res.status(404).json({ message: "Not found Address" });

    if (data.isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    Object.assign(address, data);
    await address.save();

    return res
      .status(200)
      .json({ message: "Update Address Successfully", data: address });
  } catch (error) {
    next(error);
  }
};

exports.setDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const address = await Address.findOne({ _id: id, user: userId });

    if (!address) return res.status(404).json({ message: "Not found Address" });

    await Address.updateMany({ user: userId }, { isDefault: false });

    address.isDefault = true;
    await address.save();

    return res.json({ message: "Default address updated" });
  } catch (error) {
    next(error);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const address = await Address.findOneAndDelete({ _id: id, user: userId });

    if (!address) return res.status(404).json({ message: "Not found address" });

    if (address.isDefault) {
      const nextAddress = await Address.findOne({ user: userId }).sort({
        createdAt: -1,
      });

      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    return res.status(200).json({ message: "Delete Address Successfully" });
  } catch (error) {
    next(error);
  }
};
