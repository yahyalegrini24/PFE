/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Book, GraduationCap, Layers, School, ChevronDown, ChevronUp, Trash2, Calendar } from "lucide-react";
import supabase from "../../utils/Supabase";

const ManageCourses = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null);
  const [expandedDegree, setExpandedDegree] = useState(null);
  const [expandedSchoolYear, setExpandedSchoolYear] = useState({});
  const [message, setMessage] = useState({ text: "", visible: false, type: "success" });
  const [deleteModal, setDeleteModal] = useState({ show: false, type: '', itemId: null });
  const [selectedSemester, setSelectedSemester] = useState("");

  useEffect(() => {
    if (user) {
      fetchUserBranch(user.branchId);
      fetchAcademicYears();
      fetchSemesters();
      fetchAllDegrees();
    }
  }, [user]);

  // Add this useEffect to refetch when selectedSemester changes
  useEffect(() => {
    if (user && degrees.length > 0) {
      degrees.forEach(degree => fetchSchoolYears(degree.id));
    }
  }, [selectedSemester]);

  const showMessage = (text, type = "success") => {
    setMessage({ text, visible: true, type });
    setTimeout(() => {
      setMessage({ text: "", visible: false, type: "success" });
    }, 5000);
  };

  // Fetch Academic Years
  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('*')
        .order('AcademicId', { ascending: true });

      if (error) throw error;
      setAcademicYears(data || []);
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  };

  // Determine current academic year based on current date and semester intervals
  const determineCurrentAcademicYear = useCallback(() => {
    const currentDate = new Date();
    
    // Find a semester that includes the current date
    const currentSemester = semesters.find(semester => {
      if (!semester.StartDate || !semester.EndDate) return false;
      
      const startDate = new Date(semester.StartDate);
      const endDate = new Date(semester.EndDate);
      
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (currentSemester && currentSemester.AcademicId) {
      const academicYear = academicYears.find(year => year.AcademicId === currentSemester.AcademicId);
      setCurrentAcademicYear(academicYear);
      return academicYear;
    } else {
      setCurrentAcademicYear(null);
      showMessage("Academic year still doesn't start", "warning");
      return null;
    }
  }, [semesters, academicYears]);

  // Call determineCurrentAcademicYear when semesters and academic years are loaded
  useEffect(() => {
    if (semesters.length > 0 && academicYears.length > 0) {
      determineCurrentAcademicYear();
    }
  }, [semesters, academicYears, determineCurrentAcademicYear]);

  // Fetch User Branch
  const fetchUserBranch = async (branchId) => {
    try {
      const { data, error } = await supabase
        .from('Branch')
        .select('*')
        .eq('branchId', branchId)
        .single();

      if (error) throw error;
      if (data) {
        setBranches([{
          id: data.branchId,
          BranchName: data.branchName
        }]);
      }
    } catch (error) {
      console.error("Error fetching branch:", error);
    }
  };

  // Fetch All Semesters with Academic Year info
  const fetchSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from('Semestre')
        .select(`
          *,
          AcademicYear:AcademicId (
            AcademicId,
            label
          )
        `)
        .order('StartDate', { ascending: true });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error("Error fetching semesters:", error);
    }
  };

  // Fetch All Degrees
  const fetchAllDegrees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Degree')
        .select('*');

      if (error) throw error;

      const fetchedDegrees = data.map((degree) => ({
        id: degree.degreeId,
        DegreeName: degree.degreeName,
        schoolYears: []
      }));

      setDegrees(fetchedDegrees);
      fetchedDegrees.forEach((degree) => fetchSchoolYears(degree.id));
    } catch (error) {
      console.error("Error fetching degrees:", error);
    }
  }, []);

  // Fetch School Years for a Specific Degree and Branch
  const fetchSchoolYears = async (degreeId) => {
    try {
      if (!user?.branchId) return;

      const { data: schoolYears, error } = await supabase
        .from('SchoolYear')
        .select(`
          yearId,
          yearName,
          degreeId,
          branchId,
          Branch:branchId (branchName),
          Degree:degreeId (degreeName)
        `)
        .eq('degreeId', degreeId)
        .eq('branchId', user.branchId)
        .order('yearName', { ascending: true });

      if (error) throw error;

      const schoolYearsWithModules = await Promise.all(
        schoolYears.map(async (schoolYear) => {
          let query = supabase
            .from('Module')
            .select(`
              moduleId, 
              moduleName, 
              SemesterId,
              Semestre:SemesterId (
                label,
                StartDate,
                EndDate,
                AcademicId
              )
            `)
            .eq('yearId', schoolYear.yearId);

          // Only filter by semester if one is selected
          if (selectedSemester) {
            query = query.eq('SemesterId', selectedSemester);
          }

          const { data: modules } = await query;

          return {
            id: schoolYear.yearId,
            year: schoolYear.yearName,
            DegreeId: schoolYear.degreeId,
            branchId: schoolYear.branchId,
            Branch: schoolYear.Branch,
            Degree: schoolYear.Degree,
            modules: modules?.map(module => ({
              id: module.moduleId.toString(),
              moduleName: module.moduleName,
              SemesterId: module.SemesterId,
              Semestre: module.Semestre
            })) || []
          };
        })
      );

      setDegrees(prevDegrees =>
        prevDegrees.map(degree =>
          degree.id === degreeId
            ? { ...degree, schoolYears: schoolYearsWithModules }
            : degree
        )
      );

    } catch (error) {
      console.error('Error fetching school years:', error);
      setDegrees(prevDegrees =>
        prevDegrees.map(degree =>
          degree.id === degreeId
            ? { ...degree, schoolYears: [], error: error.message }
            : degree
        )
      );
    }
  };

  // Add School Year
  const addSchoolYear = async (degreeIndex) => {
    try {
      const degree = degrees[degreeIndex];
      const branchId = user?.branchId;
      if (!branchId) throw new Error("No branch assigned to user");

      // Prompt user for year name
      const yearName = prompt("Enter the school year name (eg:1LMD):");
      if (!yearName) return;

      const yearId = crypto.randomUUID();

      const { data, error } = await supabase
        .from('SchoolYear')
        .insert([{
          yearId: yearId,
          degreeId: degree.id,
          yearName: yearName,
          branchId: branchId
        }])
        .select();

      if (error) throw error;

      setDegrees(prevDegrees =>
        prevDegrees.map((deg, idx) =>
          idx === degreeIndex
            ? { 
                ...deg, 
                schoolYears: [
                  ...deg.schoolYears, 
                  { 
                    id: yearId,
                    year: yearName,
                    DegreeId: degree.id,
                    branchId: branchId,
                    modules: [] 
                  }
                ] 
              }
            : deg
        )
      );

      showMessage("School year added successfully!");
    } catch (error) {
      console.error("Error adding school year:", error);
      showMessage(`Error: ${error.message}`, "error");
    }
  };

  // Add Module
  const addCourse = async (degreeIndex, schoolYearIndex) => {
    if (!selectedSemester) {
      showMessage("Please select a semester first", "warning");
      return;
    }

    const moduleName = prompt("Enter module name:");
    if (!moduleName) return;

    try {
      const degree = degrees[degreeIndex];
      const schoolYear = degree.schoolYears[schoolYearIndex];
      
      const moduleId = Math.floor(Math.random() * 1000000);
      
      const { data, error } = await supabase
        .from('Module')
        .insert([{
          moduleId: moduleId,
          moduleName: moduleName,
          yearId: schoolYear.id,
          SemesterId: selectedSemester
        }])
        .select();

      if (error) throw error;

      // Update the UI with the new module
      setDegrees(prevDegrees =>
        prevDegrees.map((deg, idx) =>
          idx === degreeIndex
            ? {
                ...deg,
                schoolYears: deg.schoolYears.map((year, yIdx) =>
                  yIdx === schoolYearIndex
                    ? { 
                        ...year, 
                        modules: [
                          ...year.modules, 
                          { 
                            id: moduleId.toString(), 
                            moduleName: moduleName,
                            SemesterId: selectedSemester
                          }
                        ] 
                      }
                    : year
                ),
              }
            : deg
        )
      );

      showMessage("Module added successfully!");
    } catch (error) {
      console.error("Error adding module:", error);
      showMessage(`Error: ${error.message}`, "error");
    }
  };

  const toggleSchoolYear = (schoolYearId) => {
    setExpandedSchoolYear((prev) => ({
      ...prev,
      [schoolYearId]: !prev[schoolYearId],
    }));
  };

  const handleDelete = (type, itemId) => {
    setDeleteModal({ show: true, type, itemId });
  };

  const confirmDelete = async () => {
    try {
      if (deleteModal.type === 'year') {
        await supabase
          .from('SchoolYear')
          .delete()
          .eq('yearId', deleteModal.itemId);
          
        setDegrees(prevDegrees =>
          prevDegrees.map(degree => ({
            ...degree,
            schoolYears: degree.schoolYears.filter(year => year.id !== deleteModal.itemId)
          }))
        );
      } else if (deleteModal.type === 'module') {
        await supabase
          .from('Module')
          .delete()
          .eq('moduleId', deleteModal.itemId);
          
        setDegrees(prevDegrees =>
          prevDegrees.map(degree => ({
            ...degree,
            schoolYears: degree.schoolYears.map(year => ({
              ...year,
              modules: year.modules.filter(module => module.id !== deleteModal.itemId)
            }))
          }))
        );
      }
      showMessage(`${deleteModal.type === 'year' ? 'School year' : 'Module'} deleted successfully!`);
    } catch (error) {
      console.error(`Error deleting ${deleteModal.type}:`, error);
      showMessage(`Error deleting ${deleteModal.type}: ${error.message}`, "error");
    } finally {
      setDeleteModal({ show: false, type: '', itemId: null });
    }
  };

  // Handle semester filter change
  const handleSemesterChange = (e) => {
    setSelectedSemester(e.target.value);
  };

  // Get message color based on type
  const getMessageColor = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {message.visible && (
        <div className={`fixed top-4 right-4 ${getMessageColor(message.type)} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {deleteModal.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, type: '', itemId: null })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="text-[#006633] w-8 h-8" />
        <h1 className="text-3xl font-bold text-[#006633]">Manage Department</h1>
      </div>

      {/* Current Academic Year Display */}
      {currentAcademicYear && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-blue-800">
              Current Academic Year: {currentAcademicYear.label}
            </h2>
          </div>
        </div>
      )}

      {/* Semester Filter Section */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-full md:w-64">
            <label htmlFor="semesterSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Semester
            </label>
            <select
              id="semesterSelect"
              value={selectedSemester}
              onChange={handleSemesterChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-[#006633] focus:border-[#006633]"
            >
              <option value="">All Semesters</option>
              {semesters
                .filter(semester => 
                  !currentAcademicYear || semester.AcademicId === currentAcademicYear.AcademicId
                )
                .map(semester => (
                <option key={semester.SemesterId} value={semester.SemesterId}>
                  {semester.label} 
                </option>
              ))}
            </select>
          </div>
          {selectedSemester && (
            <div className="mt-6">
              <button
                onClick={() => setSelectedSemester("")}
                className="text-sm text-[#006633] hover:underline"
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Branches Section */}
      <div className="mt-6 space-y-4">
        {branches.map((branch) => (
          <div key={branch.id} className="border rounded-lg shadow-lg bg-white p-5">
            <h2 className="text-2xl font-semibold flex items-center gap-3 text-[#006633]">
              <School className="w-6 h-6" /> {branch.BranchName}
            </h2>
          </div>
        ))}
      </div>

      {/* Degrees Section */}
      <div className="mt-6 space-y-4">
        {degrees.map((degree, degreeIndex) => (
          <div key={degree.id} className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold flex items-center gap-3 text-[#006633]">
                <Layers className="w-5 h-5" /> {degree.DegreeName}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addSchoolYear(degreeIndex)}
                  className="bg-[#006633] text-white px-3 py-1.5 rounded-lg hover:bg-[#004d26] transition"
                >
                  Add School Year
                </button>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedDegree === degreeIndex ? "rotate-180" : ""
                  } text-[#006633] cursor-pointer`}
                  onClick={() => setExpandedDegree(expandedDegree === degreeIndex ? null : degreeIndex)}
                />
              </div>
            </div>

            {/* Expanded School Years */}
            {expandedDegree === degreeIndex && (
              <div className="mt-3 pl-4 space-y-3">
                {degree.schoolYears.length > 0 ? (
                  degree.schoolYears.map((year, schoolYearIndex) => (
                    <div key={year.id} className="bg-white shadow-sm p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold flex items-center gap-3 text-[#004d26]">
                          <Book className="w-5 h-5" /> {year.year}
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => addCourse(degreeIndex, schoolYearIndex)}
                            className="bg-[#006633] text-white px-3 py-1.5 rounded-lg hover:bg-[#004d26] transition"
                          >
                            Add Course
                          </button>
                          <button
                            onClick={() => handleDelete('year', year.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete School Year"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          {expandedSchoolYear[year.id] ? (
                            <ChevronUp
                              className="w-5 h-5 text-[#006633] cursor-pointer"
                              onClick={() => toggleSchoolYear(year.id)}
                            />
                          ) : (
                            <ChevronDown
                              className="w-5 h-5 text-[#006633] cursor-pointer"
                              onClick={() => toggleSchoolYear(year.id)}
                            />
                          )}
                        </div>
                      </div>
                      
                      {expandedSchoolYear[year.id] && (
                        <div className="mt-2 space-y-2">
                          {year.modules && year.modules.length > 0 ? (
                            year.modules.map((module) => (
                              <div key={module.id} 
                                className="bg-gray-50 p-2 rounded-lg flex justify-between items-center group"
                              >
                                <div>
                                  <p className="text-gray-700">{module.moduleName}</p>
                                  {!selectedSemester && module.Semestre && (
                                    <div className="text-xs text-gray-500">
                                      <p>{module.Semestre.label}</p>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDelete('module', module.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Module"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 mt-2">
                              {selectedSemester 
                                ? "No modules available for the selected semester" 
                                : "No modules available"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No school years available.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageCourses;