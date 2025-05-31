import { useState, useEffect } from 'react';
import supabase from '../../utils/Supabase';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    branches: 0,
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
          { count: branches },
          { count: modules }
        ] = await Promise.all([
          supabase.from('Student').select('*', { count: 'exact', head: true }),
          supabase.from('Teacher').select('*', { count: 'exact', head: true }),
          supabase.from('Branch').select('*', { count: 'exact', head: true }),
          supabase.from('Module').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          students: students || 0,
          teachers: teachers || 0,
          branches: branches || 0,
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
    <div className="flex h-screen">
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold">Welcome, Admin</h1>
        <p className="mt-2 text-gray-600">Manage users, reports, and settings.</p>

        {stats.loading ? (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#036C44]"></div>
          </div>
        ) : stats.error ? (
          <div className="mt-8 p-4 bg-red-100 text-red-700 rounded-lg">
            Error loading statistics: {stats.error}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Students Card */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-gray-700">Students</h3>
              <p className="text-3xl font-bold mt-2">{stats.students}</p>
              <p className="text-sm text-gray-500 mt-1">Registered students</p>
            </div>

            {/* Teachers Card */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 className="text-lg font-semibold text-gray-700">Teachers</h3>
              <p className="text-3xl font-bold mt-2">{stats.teachers}</p>
              <p className="text-sm text-gray-500 mt-1">Teaching staff</p>
            </div>

            {/* Branches Card */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
              <h3 className="text-lg font-semibold text-gray-700">Branches</h3>
              <p className="text-3xl font-bold mt-2">{stats.branches}</p>
              <p className="text-sm text-gray-500 mt-1">Available branches</p>
            </div>

            {/* Modules Card */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
              <h3 className="text-lg font-semibold text-gray-700">Modules</h3>
              <p className="text-3xl font-bold mt-2">{stats.modules}</p>
              <p className="text-sm text-gray-500 mt-1">Academic modules</p>
            </div>
          </div>
        )}

        {/* Recent Activity Section */}
        <div className="mt-12 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="border-t pt-4">
            <p className="text-gray-500">Activity logs will appear here</p>
            {/* You can implement actual activity logs here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;