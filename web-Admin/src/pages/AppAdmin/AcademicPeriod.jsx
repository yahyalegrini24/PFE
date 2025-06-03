import { useState, useEffect } from "react";
import { Calendar, Plus, Save, Trash2, Edit } from "lucide-react";

import  supabase  from "../../utils/Supabase"; // Adjust the import path as necessar

// Function to generate Academic ID from label
const generateAcademicId = (label) => {
  // Extract years from label (e.g., "2024-2025" -> "2425")
  const match = label.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    const startYear = match[1].slice(2); // Get last 2 digits of start year
    const endYear = match[2].slice(2);   // Get last 2 digits of end year
    return parseInt(startYear + endYear); // Combine as integer
  }
  return null;
};

export default function AcademicPeriod() {
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newAcademicYear, setNewAcademicYear] = useState({
    label: "",
    semesters: [
      { label: "Semester 1", startDate: "", endDate: "" },
      { label: "Semester 2", startDate: "", endDate: "" }
    ]
  });

  // Fetch academic years with their semesters
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        setLoading(true);
        
        // Fetch academic years
        const { data: years, error: yearsError } = await supabase
          .from('AcademicYear')
          .select('*')
          .order('AcademicId', { ascending: false });

        if (yearsError) throw yearsError;

        // Fetch semesters for each academic year
        const yearsWithSemesters = await Promise.all(
          years.map(async (year) => {
            const { data: semesters, error: semestersError } = await supabase
              .from('Semestre')
              .select('*')
              .eq('AcademicId', year.AcademicId)
              .order('SemesterId', { ascending: true });

            if (semestersError) throw semestersError;
            return { ...year, semesters };
          })
        );

        setAcademicYears(yearsWithSemesters);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchAcademicYears();
  }, []);

  const handleInputChange = (field, value) => {
    if (field === "label") {
      // Always show format requirement message
      setError("Label must be in format YYYY-YYYY (e.g., 2024-2025)");
      
      // Validate format (e.g., "2024-2025")
      if (!/^\d{4}-\d{4}$/.test(value) && value !== "") {
        // Keep the error message, don't proceed with other validations
        setNewAcademicYear((prev) => ({ ...prev, [field]: value }));
        return;
      }
      
      // Check if ID already exists (only if format is valid)
      if (value !== "" && /^\d{4}-\d{4}$/.test(value)) {
        const proposedId = generateAcademicId(value);
        const existingYear = academicYears.find(year => year.AcademicId === proposedId);
        if (existingYear) {
          setError(`Academic year with ID ${proposedId} already exists`);
          setNewAcademicYear((prev) => ({ ...prev, [field]: value }));
          return;
        }
        // If format is valid and no duplicate, still show the format message
        setError("Label must be in format YYYY-YYYY (e.g., 2024-2025)");
      }
    }
    setNewAcademicYear((prev) => ({ ...prev, [field]: value }));
  };

  const handleSemesterChange = (index, field, value) => {
    setNewAcademicYear(prev => {
      const updatedSemesters = [...prev.semesters];
      updatedSemesters[index] = { ...updatedSemesters[index], [field]: value };
      return { ...prev, semesters: updatedSemesters };
    });
  };

  const generateRandomId = () => {
    return Math.floor(100000 + Math.random() * 900000); // 6-digit random number
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Generate the custom Academic ID from the label
      const customAcademicId = generateAcademicId(newAcademicYear.label);
      
      if (!customAcademicId) {
        throw new Error("Invalid label format for generating ID");
      }

      // First create the academic year with custom ID
      const { data: year, error: yearError } = await supabase
        .from('AcademicYear')
        .insert([{ 
          AcademicId: customAcademicId,
          label: newAcademicYear.label 
        }])
        .select()
        .single();

      if (yearError) throw yearError;

      // Generate random IDs for semesters
      const semestersToInsert = newAcademicYear.semesters.map(semester => ({
        SemesterId: generateRandomId(), // Assign random ID
        label: semester.label,
        StartDate: semester.startDate,
        EndDate: semester.endDate,
        AcademicId: customAcademicId // Use the custom academic ID
      }));

      const { error: semestersError } = await supabase
        .from('Semestre')
        .insert(semestersToInsert);

      if (semestersError) throw semestersError;

      // Refresh the list
      const { data: updatedYear, error: fetchError } = await supabase
        .from('AcademicYear')
        .select('*, Semestre(*)')
        .eq('AcademicId', customAcademicId)
        .single();

      if (fetchError) throw fetchError;

      setAcademicYears(prev => [updatedYear, ...prev]);
      setIsAddingYear(false);
      setNewAcademicYear({
        label: "",
        semesters: [
          { label: "Semester 1", startDate: "", endDate: "" },
          { label: "Semester 2", startDate: "", endDate: "" }
        ]
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (academicId) => {
    try {
      setLoading(true);
      
      // First delete the semesters
      const { error: semestersError } = await supabase
        .from('Semestre')
        .delete()
        .eq('AcademicId', academicId);

      if (semestersError) throw semestersError;

      // Then delete the academic year
      const { error: yearError } = await supabase
        .from('AcademicYear')
        .delete()
        .eq('AcademicId', academicId);

      if (yearError) throw yearError;

      // Update the local state
      setAcademicYears(prev => prev.filter(year => year.AcademicId !== academicId));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8">
      <div className="flex items-center gap-4 mb-8">
        <Calendar className="text-[#1E293B] w-10 h-10" />
        <h1 className="text-4xl font-extrabold text-[#1E293B] tracking-tight">
          Academic Period
        </h1>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1E293B]">
            Academic Years
          </h2>
          {!isAddingYear && (
            <button
              onClick={() => setIsAddingYear(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] text-white rounded-lg hover:bg-[#005522] transition-colors"
              disabled={loading}
            >
              <Plus className="w-5 h-5" />
              <span>New Academic Year</span>
            </button>
          )}
        </div>

        {loading && !isAddingYear ? (
          <div className="text-center py-8">Loading academic years...</div>
        ) : (
          <>
            {/* Existing Academic Years List */}
            <div className="space-y-4 mb-8">
              {academicYears.map((year) => (
                <div key={year.AcademicId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">{year.label}</h3>
                      <p className="text-sm text-gray-500">ID: {year.AcademicId}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(year.AcademicId)}
                      className="text-red-500 hover:text-red-700"
                      disabled={loading}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {year.semesters?.map((semester) => (
                      <div key={semester.SemesterId} className="bg-gray-50 p-3 rounded">
                        <h4 className="font-medium mb-2">{semester.label}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-sm text-gray-600">Start Date</p>
                            <p>{new Date(semester.StartDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">End Date</p>
                            <p>{new Date(semester.EndDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Academic Year Form */}
            {isAddingYear && (
              <div className="space-y-6 border-t pt-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 2024-2025"
                      value={newAcademicYear.label}
                      onChange={(e) => handleInputChange("label", e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
                    />
                    {newAcademicYear.label && (
                      <p className="text-sm text-gray-500 mt-1">
                        Generated ID: {generateAcademicId(newAcademicYear.label)}
                      </p>
                    )}
                  </div>

                  {newAcademicYear.semesters.map((semester, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-3">{semester.label}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={semester.startDate}
                            onChange={(e) =>
                              handleSemesterChange(index, "startDate", e.target.value)
                            }
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={semester.endDate}
                            onChange={(e) =>
                              handleSemesterChange(index, "endDate", e.target.value)
                            }
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setIsAddingYear(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 bg-[#1E293B] text-white rounded-lg hover:bg-[#1E293B] transition-colors"
                    disabled={loading || !newAcademicYear.label || 
                      !newAcademicYear.semesters[0].startDate || 
                      !newAcademicYear.semesters[0].endDate ||
                      !newAcademicYear.semesters[1].startDate || 
                      !newAcademicYear.semesters[1].endDate}
                  >
                    {loading ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}