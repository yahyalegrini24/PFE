import { UserPlus, Users, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import supabase from "../../utils/Supabase";

const BranchAdminDashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    modules: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all counts in parallel
        const [
          { count: students },
          { count: teachers },
          { count: modules }
        ] = await Promise.all([
          supabase.from('Student').select('*', { count: 'exact', head: true }),
          supabase.from('Teacher').select('*', { count: 'exact', head: true }),
          supabase.from('Module').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          students: students || 0,
          teachers: teachers || 0,
          modules: modules || 0,
          loading: false,
          error: null
        });
      } catch (error) {
        setStats(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 p-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, Branch Admin</h1>
            <p className="mt-1 text-gray-600">Manage your branch activities and resources</p>
          </div>
        </div>

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
            <button className="p-6 rounded-lg bg-blue-600 text-white flex items-center gap-4 shadow-md transition hover:bg-blue-700 hover:scale-105">
              <UserPlus className="w-8 h-8" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Add Teacher</h3>
                <p className="text-sm opacity-90">Register new Teacher to your branch</p>
              </div>
            </button>
            <button className="p-6 rounded-lg bg-green-600 text-white flex items-center gap-4 shadow-md transition hover:bg-green-700 hover:scale-105">
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