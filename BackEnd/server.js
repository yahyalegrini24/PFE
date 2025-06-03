const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { upload, handleFileUpload } = require("./UploadHandler");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for form data

// Upload endpoint
app.post("/upload", (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message });
    }
    handleFileUpload(req, res);
  });
});

// Download endpoint
app.get("/download/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupPath } = req.query; // Pass group_path as query parameter
    
    if (!groupPath) {
      return res.status(400).json({ error: "Group path is required" });
    }

    // Construct the full file path
    const filePath = path.resolve(groupPath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if it's actually a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: "Path does not point to a file" });
    }

    // Get file extension to determine content type
    const fileExtension = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream'; // Default content type
    
    // Set appropriate content type based on file extension
    switch (fileExtension) {
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case '.csv':
        contentType = 'text/csv';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }

    // Set headers for file download
    const fileName = path.basename(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Stream the file to the client
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Alternative endpoint if you want to download by providing the full path in the request body
app.post("/download", async (req, res) => {
  try {
    const { groupPath, fileName } = req.body;
    
    if (!groupPath) {
      return res.status(400).json({ error: "Group path is required" });
    }

    // Construct the full file path
    const filePath = path.resolve(groupPath);
    
    // Security check: ensure the path doesn't contain directory traversal
    if (filePath.includes('..')) {
      return res.status(400).json({ error: "Invalid file path" });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if it's actually a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: "Path does not point to a file" });
    }

    // Set headers for file download
    const downloadFileName = fileName || path.basename(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    
    // Stream the file to the client
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});