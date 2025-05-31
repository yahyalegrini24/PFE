/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Users, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import supabase from "../../utils/Supabase";

export default function ManageSessions() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTeacher, setOpenTeacher] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!user?.branchId) return;
        // Fetch teachers
        const { data: teachersData, error: teachersError } = await supabase
          .from("Teacher")
          .select(`
            teacherId,
            name,
            email
          `)
          .eq("branchId", user.branchId)
          .order("name", { ascending: true });

        if (teachersError) throw teachersError;
        setTeachers(teachersData || []);

        // Fetch sessions with all required relationships
        if (teachersData?.length > 0) {
          const { data: sessionsData, error: sessionsError } = await supabase
            .from("Session")
            .select(`
              sessionId,
              sessionNumber,
              date,
              teacherId,
              dayId,
              Module:moduleId (
                moduleId,
                moduleName
              ),
              Classroom:classId (
                classId,
                ClassNumber,
                Location
              ),
              Group:groupId (
                groupId,
                groupName,
                Section:sectionId (
                  sectionId,
                  sectionName,
                  SchoolYear:yearId (
                    yearId,
                    yearName
                  )
                )
              )
            `)
            .in("teacherId", teachersData.map(t => t.teacherId));

          if (sessionsError) {
            console.error("Sessions error:", sessionsError);
            throw sessionsError;
          }
          console.log("Sessions data:", sessionsData); // Add this to debug
          setSessions(sessionsData || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setTeachers([]);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter sessions based on year and semester
  const filteredSessionsByTeacher = sessions.reduce((acc, session) => {
    const sessionDate = session.date ? new Date(session.date) : null;
    if (!sessionDate) return acc;

    const sessionYear = sessionDate.getFullYear();
    const sessionMonth = sessionDate.getMonth() + 1;
    const sessionSemester = sessionMonth <= 6 ? 2 : 1;

    if (sessionYear === selectedYear && sessionSemester === selectedSemester) {
      if (!acc[session.teacherId]) {
        acc[session.teacherId] = [];
      }
      acc[session.teacherId].push(session);
    }
    return acc;
  }, {});

  // Get unique years from sessions
  const availableYears = [...new Set(sessions
    .map(session => session.date ? new Date(session.date).getFullYear() : null)
    .filter(Boolean))]
    .sort((a, b) => b - a);

  return (
    <div className="max-w-7xl mx-auto mt-10 p-8 bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Users className="text-[#006633] w-10 h-10" />
          <h1 className="text-4xl font-extrabold text-[#006633] tracking-tight">
            Manage Sessions
          </h1>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-4 py-2">
            <Calendar className="text-[#006633] w-5 h-5" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-[#006633] font-medium focus:outline-none bg-transparent"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-4 py-2">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(Number(e.target.value))}
              className="text-[#006633] font-medium focus:outline-none bg-transparent"
            >
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-[#006633] border-b pb-2">
          Teachers in Your Branch
        </h2>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#006633]"></span>
            <span className="ml-4 text-gray-500">Loading...</span>
          </div>
        ) : teachers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No teachers found for your branch.
          </p>
        ) : (
          <div className="space-y-4">
            {teachers.map((teacher) => {
              const isOpen = openTeacher === teacher.teacherId;
              const teacherSessions = filteredSessionsByTeacher[teacher.teacherId] || [];

              return (
                <div key={teacher.teacherId} className={`group relative bg-gradient-to-tr from-white to-green-50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${isOpen ? "ring-2 ring-[#006633]/20" : ""}`}>
                  <button
                    className="flex items-center gap-4 w-full p-4 text-left focus:outline-none"
                    onClick={() => setOpenTeacher(isOpen ? null : teacher.teacherId)}
                  >
                    <div className="relative">
                      <div className="bg-[#006633] text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shadow-sm">
                        {teacher.name[0]}
                      </div>
                      {teacherSessions.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg text-[#006633] truncate">
                        {teacher.name}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{teacher.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {teacherSessions.length} sessions in {selectedYear} (Semester {selectedSemester})
                      </span>
                      <ChevronDown className={`text-[#006633] w-6 h-6 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* Sessions list */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="p-4 pt-0">
                      <div className="border-t border-gray-100 pt-4">
                        {teacherSessions.length > 0 ? (
                          <ul className="space-y-3">
                            {teacherSessions.map((session) => (
                              <li
                                key={session.sessionId}
                                className="flex items-center gap-3 bg-white/50 border border-green-100 rounded-lg px-4 py-2 hover:bg-green-50/50 transition-colors"
                              >
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-[#006633] text-white rounded-full font-semibold text-sm">
                                  #{session.sessionNumber}
                                </span>
                                <div className="flex flex-col gap-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
                                      {session.Module?.moduleName || 'Unknown Module'}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                                      Room {session.Classroom?.ClassNumber}
                                      {session.Classroom?.Location && ` - ${session.Classroom.Location}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">
                                      {session.Group?.Section?.SchoolYear?.yearName} - {session.Group?.Section?.sectionName}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      Group: {session.Group?.groupName}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {session.date ? new Date(session.date).toLocaleString() : "N/A"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 py-2">
                            No sessions found for {selectedYear} (Semester {selectedSemester}).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}