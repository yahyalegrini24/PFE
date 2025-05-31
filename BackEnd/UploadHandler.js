const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseFolder = "Cs";
    const fileNameWithoutExt = path.parse(file.originalname).name;
    const destinationPath = path.join(process.cwd(), 'uploads', baseFolder, fileNameWithoutExt);

    try {
      fs.mkdirSync(destinationPath, { recursive: true });
      console.log(`Directory created: ${destinationPath}`);
      cb(null, destinationPath);
    } catch (err) {
      console.error('Directory creation error:', err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const processGroupFiles = async (filePath, originalFileName) => {
  try {
    console.log(`Processing file: ${filePath}`);
    
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
    const studentGroups = []; // New array for student-group relationships
    
    studentData.forEach(row => {
      if (row && row.length > 7) {
        const matricule = row[3]?.toString().trim();
        const lastName = row[4]?.toString().trim();
        const firstName = row[5]?.toString().trim();
        const sectionName = (row[6] || '').toString().trim();
        const groupName = (row[7] || '').toString().trim();
        
        if (!sectionName || !groupName) return;
        
        sections.add(sectionName);
        
        if (!groups.has(groupName)) {
          groups.set(groupName, {
            section: sectionName,
            students: []
          });
        }
        
        groups.get(groupName).students.push(row);
        
        if (matricule && lastName && firstName) {
          students.push({ matricule, firstName, lastName });
          studentGroups.push({ matricule, groupName }); // Add to studentGroups
        }
      }
    });

    const groupesDir = path.join(path.dirname(filePath), 'Groupes');
    fs.mkdirSync(groupesDir, { recursive: true });

    const groupFiles = [];
    const baseName = path.parse(originalFileName).name;

    for (const [groupName, groupData] of groups.entries()) {
      if (groupData.students.length === 0) continue;

      const groupStudentData = [headers, ...groupData.students];
      const newWorkbook = xlsx.utils.book_new();
      const newWorksheet = xlsx.utils.aoa_to_sheet(groupStudentData);
      xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Students');

      const safeGroupName = groupName.replace(/\s+/g, '_');
      const groupFileName = `${baseName}_${safeGroupName}.xlsx`;
      const groupFilePath = path.join(groupesDir, groupFileName);

      xlsx.writeFile(newWorkbook, groupFilePath);
      
      groupFiles.push({
        sectionName: groupData.section,
        groupName,
        fileName: groupFileName,
        filePath: groupFilePath,
        studentCount: groupData.students.length,
        students: groupData.students
      });
    }

    return {
      sections: Array.from(sections),
      groupFiles,
      students,
      studentGroups // Include in response
    };
  } catch (error) {
    console.error('File processing error:', error);
    throw error;
  }
};

const handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const { sections, groupFiles, students, studentGroups } = await processGroupFiles(req.file.path, req.file.originalname);

    const response = {
      originalFile: {
        name: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        type: req.file.mimetype,
      },
      uploadDate: new Date().toISOString(),
      sections,
      groupFiles: groupFiles.map(gf => ({
        sectionName: gf.sectionName,
        groupName: gf.groupName,
        filePath: gf.filePath,
        studentCount: gf.studentCount,
        students: gf.students
      })),
      students,
      studentGroups // Include in response
    };
    
    res.json(response);
  } catch (error) {
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