import React, { useState, useEffect } from "react";
import { Upload, File, XCircle, CheckCircle, ChevronDown, ChevronUp, Trash } from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import supabase from "../../utils/Supabase";

const UploadLists = () => {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [degrees, setDegrees] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [expandedFileId, setExpandedFileId] = useState(null);
  const [fileDetails, setFileDetails] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      await fetchBranchName();
      await fetchDegrees();
      await fetchAcademicYears();
      await fetchSavedFiles();
    };
    fetchData();
  }, []);

  const fetchBranchName = async () => {
    try {
      const { data, error } = await supabase
        .from('Branch')
        .select('branchName')
        .eq('branchId', user.branchId)
        .single();
        
      if (error) throw error;
      setBranchName(data?.branchName || '');
    } catch (error) {
      console.error("Error fetching branch name:", error);
    }
  };

  const fetchDegrees = async () => {
    try {
      const { data, error } = await supabase
        .from('Degree')
        .select('degreeId, degreeName');

      if (error) throw error;
      setDegrees(data || []);
    } catch (error) {
      console.error("Error fetching degrees:", error);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('AcademicId, label')
        .order('label', { ascending: false }); // Most recent first

      if (error) throw error;
      setAcademicYears(data || []);
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  };

  const fetchSchoolYears = async (degreeId) => {
    try {
      const { data, error } = await supabase
        .from('SchoolYear')
        .select('yearId, yearName, degreeId')
        .eq('degreeId', degreeId);

      if (error) throw error;
      setSchoolYears(data || []);
    } catch (error) {
      console.error("Error fetching school years:", error);
    }
  };

  const fetchSavedFiles = async (academicYearFilter = null) => {
    try {
      let query = supabase
        .from('Student_List')
        .select(`
          *,
          Degree!student_list_degreeid_fkey(degreeId, degreeName),
          SchoolYear!student_list_schoolyearid_fkey(yearId, yearName),
          AcademicYear!Student_List_AcademicYearId_fkey(AcademicId, label)
        `)
        .eq('branchId', user.branchId);

      // Apply academic year filter if selected
      if (academicYearFilter) {
        query = query.eq('AcademicYearId', academicYearFilter);
      }

      const { data, error } = await query.order('uploadDate', { ascending: false });

      if (error) throw error;

      const formattedData = data.map(file => ({
        ...file,
        degreeName: file.Degree?.degreeName || 'Unknown Degree',
        schoolYear: file.SchoolYear?.yearName || 'Unknown Year',
        academicYear: file.AcademicYear?.label || 'Unknown Academic Year'
      }));

      setFileDetails(formattedData || []);
    } catch (error) {
      console.error("Error fetching saved files:", error);
    }
  };

  const handleUploadExcel = (e) => {
    const file = e.target.files[0];
    validateFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    validateFile(file);
  };

  const validateFile = (file) => {
    if (!file) return;

    if (
      file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
      file.type !== "application/vnd.ms-excel"
    ) {
      setError("❌ Please upload a valid Excel file (.xlsx or .xls).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("⚠️ File size exceeds 5MB limit.");
      return;
    }

    setUploadedFiles((prevFiles) => [
      ...prevFiles,
      {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        degree: "",
        schoolYear: "",
      },
    ]);
    setError("");
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
  };

  const handleDegreeChange = (fileId, degreeId) => {
    setUploadedFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, degree: degreeId, schoolYear: "" } : file
      )
    );
    if (degreeId) {
      fetchSchoolYears(degreeId);
    }
  };

  const handleSchoolYearChange = (fileId, schoolYearId) => {
    setUploadedFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, schoolYear: schoolYearId } : file
      )
    );
  };

  const handleAcademicYearChange = (academicYearId) => {
    setSelectedAcademicYear(academicYearId);
    fetchSavedFiles(academicYearId);
  };

  const toggleFileExpansion = (fileId) => {
    setExpandedFileId((prevId) => (prevId === fileId ? null : fileId));
  };

  const handleSaveFile = async (fileId) => {
    const file = uploadedFiles.find((file) => file.id === fileId);
    if (!file.degree || !file.schoolYear) {
      setError("❌ Please select a degree and school year before saving.");
      return;
    }

    if (!selectedAcademicYear) {
      setError("❌ Please select an academic year from the global filter before saving files.");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("file", file.file);
      formData.append("degreeId", file.degree);
      formData.append("schoolYearId", file.schoolYear);
      formData.append("academicYearId", selectedAcademicYear);
      formData.append("branchName", branchName);

      const uploadResponse = await axios.post("http://localhost:3000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      if (!uploadResponse.data) {
        throw new Error("Failed to upload file to the server.");
      }
  
      const { originalFile, sections, groupFiles, students, studentGroups } = uploadResponse.data;
      await storeInSupabase({
        originalFile,
        sections,
        groupFiles,
        students,
        studentGroups,
        schoolYearId: file.schoolYear,
        degreeId: file.degree,
        AcademicYearId: selectedAcademicYear,
        branchId: user.branchId
      });
      
      setUploadedFiles((prevFiles) => prevFiles.filter((f) => f.id !== fileId));
      fetchSavedFiles(selectedAcademicYear);
      alert(`File "${file.name}" saved successfully!`);
    } catch (error) {
      console.error("Error saving file:", error);
      setError(`❌ Failed to save file: ${error.message}`);
    }
  };

  async function storeInSupabase({ originalFile, sections, groupFiles, students, studentGroups, schoolYearId, degreeId, AcademicYearId, branchId }) {
    try {
      // 1. Insert sections
      const sectionInserts = [];
      const sectionMap = {};
      
      for (const sectionName of sections) {
        const sectionId = crypto.randomUUID();
        sectionInserts.push({
          sectionId,
          yearId: schoolYearId,
          sectionName
        });
        sectionMap[sectionName] = sectionId;
      }
      
      const { error: sectionError } = await supabase
        .from('Section')
        .insert(sectionInserts);
      
      if (sectionError) throw sectionError;

      // 2. Insert groups
      const groupInserts = [];
      const groupNameToIdMap = {};
      
      for (const groupFile of groupFiles) {
        const groupId = crypto.randomUUID();
        const sectionId = sectionMap[groupFile.sectionName];
        
        if (!sectionId) {
          throw new Error(`Section not found: ${groupFile.sectionName}`);
        }

        groupInserts.push({
          groupId,
          sectionId,
          groupName: groupFile.groupName,
          group_path: groupFile.filePath
        });
        
        groupNameToIdMap[groupFile.groupName] = groupId;
      }

      const { error: groupError } = await supabase
        .from('Group')
        .insert(groupInserts);
      
      if (groupError) throw groupError;

      // 3. Insert students
      const studentInserts = students.map(student => ({
        matricule: student.matricule,
        firstName: student.firstName,
        lastName: student.lastName,
        degreeId: degreeId,
      }));

      const { error: studentError } = await supabase
        .from('Student')
        .upsert(studentInserts, { onConflict: 'matricule' });
      
      if (studentError) throw studentError;

      // 4. Insert student-group relationships
      const studentGroupInserts = studentGroups.map(rel => ({
        matricule: rel.matricule,
        groupId: groupNameToIdMap[rel.groupName]
      })).filter(rel => rel.groupId);

      if (studentGroupInserts.length > 0) {
        const { error: studentGroupError } = await supabase
          .from('StudentGroup')
          .insert(studentGroupInserts);
        
        if (studentGroupError) throw studentGroupError;
      }

      // 5. Insert the main file record
      const fileId = crypto.randomUUID();
      const { error: fileError } = await supabase
        .from('Student_List')
        .insert([{
          id: fileId,
          fileName: originalFile.name,
          fileSize: originalFile.size,
          fileType: originalFile.type,
          uploadDate: new Date().toISOString(),
          degreeId: degreeId,
          schoolYearId: schoolYearId,
          AcademicYearId: AcademicYearId,
          filePath: originalFile.path,
          branchId: branchId,
        }]);
      
      if (fileError) throw fileError;

      return {
        sectionsInserted: sectionInserts.length,
        groupsInserted: groupInserts.length,
        studentsInserted: studentInserts.length,
        studentGroupsInserted: studentGroupInserts.length,
        fileInserted: fileId
      };
    } catch (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }
  }

  const handleDeleteFile = async (fileId) => {
    try {
      const { error } = await supabase
        .from('Student_List')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      fetchSavedFiles(selectedAcademicYear);
      alert("File deleted successfully!");
    } catch (error) {
      console.error("Error deleting file:", error);
      setError("❌ Failed to delete file. Please try again.");
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold text-[#006633] mb-6 flex items-center">
        <Upload className="mr-3" size={32} /> Upload Students Lists
      </h1>

      {/* Global Academic Year Filter */}
      <div className="w-full max-w-lg mb-6">
        <label className="block text-gray-700 font-semibold mb-2 text-center">
          Select Academic Year
        </label>
        <select
          value={selectedAcademicYear}
          onChange={(e) => handleAcademicYearChange(e.target.value)}
          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#006633] text-center font-medium"
        >
          <option value="">-- Select Academic Year --</option>
          {academicYears.map((year) => (
            <option key={`global-academic-${year.AcademicId}`} value={year.AcademicId}>
              {year.label}
            </option>
          ))}
        </select>
        {selectedAcademicYear && (
          <p className="text-center text-sm text-gray-600 mt-2">
            Currently viewing: <span className="font-semibold text-[#006633]">
              {academicYears.find(y => y.AcademicId.toString() === selectedAcademicYear)?.label}
            </span>
          </p>
        )}
      </div>

      <div
        className={`w-full max-w-lg p-6 border-2 border-dashed rounded-lg transition-all duration-300 ${
          dragging ? "border-[#006633] bg-gray-100" : "border-gray-300 bg-white"
        } flex flex-col items-center justify-center cursor-pointer`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="text-[#006633] mb-3" size={40} />
        <p className="text-gray-600">
          Drag & Drop Excel files here or{" "}
          <label className="text-[#006633] font-semibold cursor-pointer">
            click to browse
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleUploadExcel}
            />
          </label>
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm flex items-center justify-between w-full max-w-lg">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <XCircle size={18} />
          </button>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-6 w-full max-w-4xl">
          <h2 className="text-xl font-semibold text-[#006633] mb-3 flex items-center">
            <File className="mr-2" size={24} /> Uploaded Files
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.map((file) => (
              <div
                key={`uploaded-${file.id}`}
                className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-500 mr-2" size={20} />
                    <span className="text-gray-700">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFileExpansion(file.id)}
                      className="text-[#006633] hover:text-[#004d26]"
                    >
                      {expandedFileId === file.id ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>

                {expandedFileId === file.id && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Select Degree</label>
                      <select
                        value={file.degree}
                        onChange={(e) => handleDegreeChange(file.id, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#006633]"
                      >
                        <option value="">-- Select Degree --</option>
                        {degrees.map((degree) => (
                          <option key={`degree-${degree.degreeId}`} value={degree.degreeId}>
                            {degree.degreeName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Select School Year</label>
                      <select
                        value={file.schoolYear}
                        onChange={(e) => handleSchoolYearChange(file.id, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#006633]"
                        disabled={!file.degree}
                      >
                        <option value="">-- Select School Year --</option>
                        {schoolYears.map((year) => (
                          <option key={`year-${year.yearId}`} value={year.yearId}>
                            {year.yearName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleSaveFile(file.id)}
                      className="w-full bg-[#006633] text-white px-4 py-2 rounded-lg hover:bg-[#004d26] transition"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {fileDetails.length > 0 && (
        <div className="mt-6 w-full max-w-4xl">
          <h2 className="text-xl font-semibold text-[#006633] mb-3 flex items-center">
            <File className="mr-2" size={24} /> Saved Files
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fileDetails.map((file) => (
              <div
                key={`saved-${file.id}`}
                className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-500 mr-2" size={20} />
                    <span className="text-gray-700">
                      {file.degreeName} - {file.schoolYear}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash size={20} />
                  </button>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p>Academic Year: {file.academicYear}</p>
                  <p>File: {file.fileName}</p>
                  <p>Size: {(file.fileSize / 1024).toFixed(2)} KB</p>
                  <p>Uploaded: {new Date(file.uploadDate).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadLists;