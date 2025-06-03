const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// Temp storage configuration
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: tempStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
}).single('file');

const processGroupFiles = async (filePath, originalFileName, branchName) => {
  try {
    console.log(`Processing file for branch: ${branchName}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('Uploaded file not found');
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const allData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    // Find headers
    let headerRowIndex = 0;
    while (headerRowIndex < allData.length && 
          (!allData[headerRowIndex] || allData[headerRowIndex].every(cell => cell === null))) {
      headerRowIndex++;
    }

    if (headerRowIndex >= allData.length) {
      throw new Error("No headers found in the Excel file");
    }

    const headers = allData[headerRowIndex];
    const studentData = allData.slice(headerRowIndex + 1);

    const sections = new Set();
    const groups = new Map();
    const students = [];
    const studentGroups = [];
    
    studentData.forEach(row => {
      if (row && row.length > 7) {
        const matricule = row[3]?.toString().trim();
        const lastName = row[4]?.toString().trim();
        const firstName = row[5]?.toString().trim();
        const sectionName = (row[6] || '').toString().trim().toLowerCase();
        const groupName = (row[7] || '').toString().trim().toLowerCase();
        
        if (!sectionName || !groupName) return;
        
        const normalizedSection = sectionName.includes('section') ? 
          `Section ${sectionName.replace(/section\s*/i, '').toUpperCase()}` : 
          `Section ${sectionName.toUpperCase()}`;
        
        sections.add(normalizedSection);
        const groupKey = `${normalizedSection}_${groupName}`;
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            section: normalizedSection,
            groupName,
            students: []
          });
        }
        
        groups.get(groupKey).students.push(row);
        
        if (matricule && lastName && firstName) {
          students.push({ matricule, firstName, lastName });
          studentGroups.push({ matricule, groupName: groupKey });
        }
      }
    });

    const baseDir = path.join(path.dirname(filePath), 'Groupes');
    fs.mkdirSync(baseDir, { recursive: true });

    const groupFiles = [];
    const baseName = path.parse(originalFileName).name;

    for (const [groupKey, groupData] of groups.entries()) {
      if (groupData.students.length === 0) continue;

      const groupStudentData = [headers, ...groupData.students];
      const newWorkbook = xlsx.utils.book_new();
      const newWorksheet = xlsx.utils.aoa_to_sheet(groupStudentData);
      xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Students');

      const safeGroupName = groupKey.replace(/\s+/g, '_');
      const groupFileName = `${baseName}_${safeGroupName}.xlsx`;
      const groupFilePath = path.join(baseDir, groupFileName);

      xlsx.writeFile(newWorkbook, groupFilePath);
      
      groupFiles.push({
        sectionName: groupData.section,
        groupName: groupKey,
        fileName: groupFileName,
        filePath: groupFilePath,
        studentCount: groupData.students.length
      });
    }

    return {
      sections: Array.from(sections),
      groupFiles,
      students,
      studentGroups
    };
  } catch (error) {
    console.error('File processing error:', error);
    throw error;
  }
};

const handleFileUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const tempDir = path.join(process.cwd(), 'uploads', 'temp');
  const tempFilePath = req.file.path; // Store this before processing

  try {
    const branchName = req.body.branchName || 'Default';
    const academicYearId = req.body.academicYearId; // Get academic year ID from request
    
    // Validate that academicYearId is provided
    if (!academicYearId) {
      throw new Error('Academic Year ID is required');
    }
    
    console.log(`Processing upload for branch: ${branchName}, Academic Year: ${academicYearId}`);

    // Create final destination path with academic year ID
    const finalDir = path.join(process.cwd(), 'uploads', branchName, academicYearId, path.parse(req.file.originalname).name);
    fs.mkdirSync(finalDir, { recursive: true });
    const finalPath = path.join(finalDir, req.file.originalname);

    // Move file from temp to final location
    fs.renameSync(tempFilePath, finalPath);

    // Process the file
    const { sections, groupFiles, students, studentGroups } = await processGroupFiles(
      finalPath,
      req.file.originalname,
      branchName
    );

    // Clean up temp directory
    try {
      // Remove all files in temp directory first
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      // Then remove the directory itself
      fs.rmdirSync(tempDir);
    } catch (cleanupError) {
      console.error('Temp directory cleanup error:', cleanupError);
    }

    res.json({
      originalFile: {
        name: req.file.originalname,
        path: finalPath,
        size: req.file.size,
        type: req.file.mimetype,
      },
      uploadDate: new Date().toISOString(),
      sections,
      groupFiles,
      students,
      studentGroups,
      branchName,
      academicYearId // Include in response for confirmation
    });
  } catch (error) {
    // Clean up temp file if error occurred
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (unlinkError) {
        console.error('Error cleaning up temp file:', unlinkError);
      }
    }
    
    console.error("Upload failed:", error);
    res.status(500).json({ 
      error: error.message || "File processing error",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  upload,
  handleFileUpload
};