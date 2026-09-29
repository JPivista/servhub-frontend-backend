const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    project: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true, lowercase: true },
    unit: { type: String, trim: true, default: "" },
    /** Stationery is listed for every department. Other products stay on their department. */
    shared: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);
