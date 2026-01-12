

// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
// import Razorpay from "razorpay";
import bodyParser from "body-parser";
import fs from "fs";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";

dotenv.config();
const app = express();

// -------------------
// Ensure uploads folder exists
// -------------------
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// -------------------
// Middleware
// -------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",     // React Admin
      "http://localhost:8081",     // EXPO WEB
      "http://192.168.29.72:8081", // EXPO MOBILE (same network)
      "*"                          // NGROK / ANY ORIGIN (TEMPORARY)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR)); // IMAGE SERVING

// -------------------
// HTTP + Socket.IO
// -------------------
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:8081",
      "http://192.168.29.72:8081",
      "*"  // NGROK
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.emit("welcome", { message: "Welcome to Socket.io server!" });
  socket.on("disconnect", () => console.log(`Client disconnected: ${socket.id}`));
});

// -------------------
// MongoDB Connection
// -------------------
// const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecommerce";
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("❌ MONGO_URI missing in environment variables");
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch((err) => {
    console.error("❌ Mongo Error:", err);
    process.exit(1);
  });



// -------------------
// Multer Setup
// -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// -------------------
// Razorpay Setup
// -------------------
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID || "",
//   key_secret: process.env.RAZORPAY_KEY_SECRET || "",
// });

// -------------------
// SCHEMAS & MODELS
// -------------------
const categorySchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: "Active" },
  image: String,
});
const Category = mongoose.model("Category", categorySchema);

const subcategorySchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  name: String,
  status: { type: String, default: "Active" },
  image: String,
});
const Subcategory = mongoose.model("Subcategory", subcategorySchema);

const productSchema = new mongoose.Schema({
  name: String,
  currentPrice: Number,
  discountPrice: { type: Number, default: 0 },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },
  description: String,
  promoCode: String,
  image: String,
  status: { type: String, default: "Active" },
});
const Product = mongoose.model("Product", productSchema);

const addOrderSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    address: String,
    country: String,
    state: String,
    city: String,
    postalCode: String,
    orderNumber: String,
    totalQty: Number,
    totalCost: Number,
  },
  { timestamps: true }
);
const AddOrder = mongoose.model("AddOrder", addOrderSchema, "addorder");

const profileSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    profilePicture: String,
    password: String,
  },
  { timestamps: true }
);
const Profile = mongoose.model("Profile", profileSchema);

const faqSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);
const FAQ = mongoose.model("FAQ", faqSchema);

const contactUsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    website: String,
    message: { type: String, required: true },
  },
  { timestamps: true }
);
const ContactUs = mongoose.model("ContactUs", contactUsSchema);

// -------------------
// TEST ROUTE
// -------------------
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Backend is LIVE!" });
});

// -------------------
// CATEGORY ROUTES
// -------------------
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/categories", upload.single("image"), async (req, res) => {
  try {
    const newCategory = new Category({
      ...req.body,
      image: req.file ? req.file.filename : null,
    });
    await newCategory.save();
    io.emit("categoryUpdated", newCategory);
    res.status(201).json({ success: true, data: newCategory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/categories/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { name: req.body.name, status: req.body.status };
    if (req.file) updateData.image = req.file.filename;
    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedCategory) return res.status(404).json({ success: false, message: "Category not found" });
    io.emit("categoryUpdated", updatedCategory);
    res.json({ success: true, data: updatedCategory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) return res.status(404).json({ success: false, message: "Category not found" });
    io.emit("categoryDeleted", deletedCategory);
    res.json({ success: true, data: deletedCategory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// SUBCATEGORY ROUTES
// -------------------
app.get("/api/subcategories", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { categoryId: category } : {};
    const subcategories = await Subcategory.find(filter).populate("categoryId");
    res.json({ success: true, data: subcategories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/subcategories", upload.single("image"), async (req, res) => {
  try {
    const { name, categoryId, status } = req.body;
    const newSub = new Subcategory({
      name,
      categoryId,
      status: status || "Active",
      image: req.file ? req.file.filename : null,
    });
    await newSub.save();
    io.emit("subcategoryUpdated", newSub);
    res.status(201).json({ success: true, data: newSub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/subcategories/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, status } = req.body;
    const updateData = { name, categoryId, status };
    if (req.file) updateData.image = req.file.filename;
    const updatedSub = await Subcategory.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedSub) return res.status(404).json({ success: false, message: "Subcategory not found" });
    io.emit("subcategoryUpdated", updatedSub);
    res.json({ success: true, data: updatedSub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/subcategories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSub = await Subcategory.findByIdAndDelete(id);
    if (!deletedSub) return res.status(404).json({ success: false, message: "Subcategory not found" });
    io.emit("subcategoryDeleted", deletedSub);
    res.json({ success: true, data: deletedSub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// PRODUCTS ROUTES
// -------------------
app.get("/api/products", async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    const filter = {};

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.categoryId = category;
    }
    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategoryId = subcategory;
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name")
      .populate("subcategoryId", "name");

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// SINGLE PRODUCT BY ID
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categoryId", "name")
      .populate("subcategoryId", "name");
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    const newProduct = new Product({
      ...req.body,
      image: req.file ? req.file.filename : null,
    });
    await newProduct.save();
    const populated = await Product.findById(newProduct._id)
      .populate("categoryId", "name")
      .populate("subcategoryId", "name");
    io.emit("productUpdated", populated);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      name: req.body.name,
      currentPrice: req.body.currentPrice,
      discountPrice: req.body.discountPrice || 0,
      categoryId: req.body.categoryId,
      subcategoryId: req.body.subcategoryId,
      description: req.body.description,
      promoCode: req.body.promoCode,
      status: req.body.status || "Active",
    };
    if (req.file) updateData.image = req.file.filename;

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedProduct) return res.status(404).json({ success: false, message: "Product not found" });

    const populated = await Product.findById(updatedProduct._id)
      .populate("categoryId", "name")
      .populate("subcategoryId", "name");
    io.emit("productUpdated", populated);
    res.json({ success: true, message: "Product updated", data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) return res.status(404).json({ success: false, message: "Product not found" });
    io.emit("productDeleted", deletedProduct);
    res.json({ success: true, message: "Product deleted", data: deletedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// ORDERS, PROFILES, FAQ, CONTACT
// -------------------
app.get("/api/addorder", async (req, res) => {
  try {
    const orders = await AddOrder.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/addorder", async (req, res) => {
  try {
    const newOrder = new AddOrder(req.body);
    const savedOrder = await newOrder.save();
    io.emit("newOrder", savedOrder);
    res.status(201).json({ success: true, data: savedOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/profiles", async (req, res) => {
  try {
    const profiles = await Profile.find();
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/profiles", upload.single("profilePicture"), async (req, res) => {
  try {
    const profile = new Profile({
      ...req.body,
      profilePicture: req.file ? req.file.filename : null,
    });
    await profile.save();
    io.emit("profileUpdated", profile);
    res.status(201).json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/faqs", async (req, res) => {
  try {
    const faqs = await FAQ.find();
    res.json({ success: true, data: faqs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/faqs", async (req, res) => {
  try {
    const faq = new FAQ(req.body);
    await faq.save();
    io.emit("faqUpdated", faq);
    res.status(201).json({ success: true, data: faq });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await ContactUs.find();
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/contacts", async (req, res) => {
  try {
    const contact = new ContactUs(req.body);
    await contact.save();
    io.emit("contactUpdated", contact);
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// START SERVER (PORT CHANGED TO 5001)
// -------------------
// const PORT = process.env.PORT || 5001;  // <--- YAHAN CHANGE KIYA HAI
const PORT = process.env.PORT || 8080;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Admin Backend running on http://localhost:${PORT}`);
  console.log(`Local IP: http://192.168.29.72:${PORT}`);
});