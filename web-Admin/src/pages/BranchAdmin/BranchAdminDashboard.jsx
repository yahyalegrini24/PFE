/* eslint-disable no-unused-vars */
import { UserPlus, Users, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import supabase from "../../utils/Supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const BranchAdminDashboard = () => {
  const Navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    modules: 0,
    loading: true,
    error: null
  });
  const [branchId, setBranchId] = useState(null);

  useEffect(() => {
    const fetchBranchStats = async () => {
      try {
        if (!user) {
          throw new Error("User not authenticated");
        }

        const currentBranchId = user.branchId;
        
        if (!currentBranchId) {
          throw new Error("Branch ID not found for user");
        }

        setBranchId(currentBranchId);
        setStats(prev => ({ ...prev, loading: true, error: null }));

        // Get all school years for the branch
        const { data: schoolYears, error: yearsError } = await supabase
          .from('SchoolYear')
          .select('yearId')
          .eq('branchId', currentBranchId);

        if (yearsError) throw yearsError;
        if (!schoolYears || schoolYears.length === 0) {
          return setStats({
            students: 0,
            teachers: 0,
            modules: 0,
            loading: false,
            error: null
          });
        }

        const yearIds = schoolYears.map(year => year.yearId);

        // Get all sections for these school years
        const { data: sections, error: sectionsError } = await supabase
          .from('Section')
          .select('sectionId')
          .in('yearId', yearIds);

        if (sectionsError) throw sectionsError;
        const sectionIds = sections?.map(section => section.sectionId) || [];

        // Get all groups for these sections
        const { data: groups, error: groupsError } = await supabase
          .from('Group')
          .select('groupId')
          .in('sectionId', sectionIds);

        if (groupsError) throw groupsError;
        const groupIds = groups?.map(group => group.groupId) || [];

        // Get unique student matricules from StudentGroup table
        const { data: studentMatricules, error: studentMatriculesError } = await supabase
          .from('StudentGroup')
          .select('matricule')
          .in('groupId', groupIds);

        if (studentMatriculesError) throw studentMatriculesError;

        // Get unique matricules
        const uniqueMatricules = [...new Set(studentMatricules?.map(sg => sg.matricule) || [])];

        // Fetch all counts in parallel
        const [
          { count: students, error: studentsError },
          { count: teachers, error: teachersError },
          { count: modules, error: modulesError }
        ] = await Promise.all([
          // Count unique students by their matricules
          uniqueMatricules.length > 0 
            ? supabase
                .from('Student')
                .select('matricule', { count: 'exact', head: true })
                .in('matricule', uniqueMatricules)
            : Promise.resolve({ count: 0, error: null }),
          supabase
            .from('Teacher')
            .select('*', { count: 'exact', head: true })
            .eq('branchId', currentBranchId),
          supabase
            .from('Module')
            .select('*', { count: 'exact', head: true })
            .in('yearId', yearIds)
        ]);

        // Check for errors in counts
        if (studentsError) throw studentsError;
        if (teachersError) throw teachersError;
        if (modulesError) throw modulesError;

        setStats({
          students: students || 0,
          teachers: teachers || 0,
          modules: modules || 0,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to load statistics"
        }));
      }
    };

    if (user) {
      fetchBranchStats();
    }
  }, [user]);

  return (
    <div className="flex h-screen bg-gray-50 p-6">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, Branch Admin</h1>
            <p className="mt-1 text-gray-600">
             Manage your branch activities and resources
            </p>
          </div>
        </div>

        {/* Error Display */}
        {stats.error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p>Error: {stats.error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Students Card */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">Students</h3>
                <p className="text-3xl font-bold mt-2">
                  {stats.loading ? '--' : stats.students}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          {/* Teachers Card */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">Teachers</h3>
                <p className="text-3xl font-bold mt-2">
                  {stats.loading ? '--' : stats.teachers}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>

          {/* Modules Card */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">Modules</h3>
                <p className="text-3xl font-bold mt-2">
                  {stats.loading ? '--' : stats.modules}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => Navigate('/branch-admin/teacher-management')}
              className="p-6 rounded-lg bg-blue-600 text-white flex items-center gap-4 shadow-md transition hover:bg-blue-700 hover:scale-105 disabled:opacity-50"
              disabled={stats.loading}
            >
              <UserPlus className="w-8 h-8" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Add Teacher</h3>
                <p className="text-sm opacity-90">Register new Teacher to your branch</p>
              </div>
            </button>
            <button 
              onClick={() => Navigate('/branch-admin/student-lists')}
              className="p-6 rounded-lg bg-green-600 text-white flex items-center gap-4 shadow-md transition hover:bg-green-700 hover:scale-105 disabled:opacity-50"
              disabled={stats.loading}
            >
              <UserPlus className="w-8 h-8" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Add List</h3>
                <p className="text-sm opacity-90">Add new Student List to your branch</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchAdminDashboard;