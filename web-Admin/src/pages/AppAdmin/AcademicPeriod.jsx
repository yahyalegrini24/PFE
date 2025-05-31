import { useState } from "react";
import { Calendar, Plus, Check, X, Save } from "lucide-react";

export default function AcademicPeriod() {
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newAcademicYear, setNewAcademicYear] = useState({
    year: "",
    semester1: {
      startDate: "",
      endDate: "",
    },
    semester2: {
      startDate: "",
      endDate: "",
    },
  });

  const handleInputChange = (field, value) => {
    setNewAcademicYear((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSemesterChange = (semester, field, value) => {
    setNewAcademicYear((prev) => ({
      ...prev,
      [semester]: {
        ...prev[semester],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    // Here you would typically save to your backend
    console.log("Saving academic year:", newAcademicYear);
    // Reset form
    setNewAcademicYear({
      year: "",
      semester1: { startDate: "", endDate: "" },
      semester2: { startDate: "", endDate: "" },
    });
    setIsAddingYear(false);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8">
      <div className="flex items-center gap-4 mb-8">
        <Calendar className="text-[#1E293B] w-10 h-10" />
        <h1 className="text-4xl font-extrabold text-[#1E293B] tracking-tight">
          Academic Period
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1E293B]">
            Create Academic Year
          </h2>
          {!isAddingYear && (
            <button
              onClick={() => setIsAddingYear(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] text-white rounded-lg hover:bg-[#005522] transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Academic Year</span>
            </button>
          )}
        </div>

        {isAddingYear && (
          <div className="space-y-6">
            <div className="space-y-4">
              {/* Academic Year Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2023-2024"
                  value={newAcademicYear.year}
                  onChange={(e) =>
                    handleInputChange("year", e.target.value)
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
                />
              </div>

              {/* Semester 1 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3">Semester 1</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newAcademicYear.semester1.startDate}
                      onChange={(e) =>
                        handleSemesterChange(
                          "semester1",
                          "startDate",
                          e.target.value
                        )
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
                      value={newAcademicYear.semester1.endDate}
                      onChange={(e) =>
                        handleSemesterChange("semester1", "endDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
                    />
                  </div>
                </div>
              </div>

              {/* Semester 2 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3">Semester 2</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newAcademicYear.semester2.startDate}
                      onChange={(e) =>
                        handleSemesterChange(
                          "semester2",
                          "startDate",
                          e.target.value
                        )
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
                      value={newAcademicYear.semester2.endDate}
                      onChange={(e) =>
                        handleSemesterChange("semester2", "endDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setIsAddingYear(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-[#1E293B] text-white rounded-lg hover:bg-[#1E293B] transition-colors"
              >
                <Save className="w-5 h-5" />
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}