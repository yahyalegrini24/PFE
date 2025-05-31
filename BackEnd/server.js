const express = require("express");
const cors = require("cors");
const path = require("path");
const { upload, handleFileUpload } = require("./UploadHandler");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Upload endpoint
app.post("/upload", upload.single("file"), handleFileUpload);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});