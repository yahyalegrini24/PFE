import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  UserCog,
} from "lucide-react";
import { useAuth } from "../context/AuthContext"; // Adjust the import path as needed

const BSidebar = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    // You might want to redirect after logout
    // navigate('/login');
  };

  return (
    <div className="w-64 bg-[#023B28] text-white h-full flex flex-col">
      {/* Sidebar Content */}
      <div className="p-5 shadow-xl flex flex-col h-full overflow-y-auto">
        {/* Sidebar Header */}
        <h2 className="text-xl font-semibold mb-6 text-center tracking-wide border-b border-[#036C44] pb-3">
          Admin Panel
        </h2>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1">
          <Link to="/branch-admin" className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-[#036C44] hover:pl-5">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          
          <Link to="/branch-admin/manage-courses" className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-[#036C44] hover:pl-5">
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Management</span>
          </Link>
          {/* Existing sections continue */}
          <Link to="/branch-admin/student-lists" className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-[#036C44] hover:pl-5">
            <Users className="w-5 h-5" />
            <span className="font-medium">Student Lists</span>
          </Link>
          <Link to="/branch-admin/teacher-management" className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-[#036C44] hover:pl-5">
            <UserCog className="w-5 h-5" />
            <span className="font-medium">Teacher Management</span>
          </Link>
          <Link to="/branch-admin/manage-sessions" className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-[#036C44] hover:pl-5">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Manage Sessions</span>
          </Link>
        </nav>
        
        {/* Admin Info & Logout */}
        <div className="mt-auto border-t border-[#036C44] pt-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-[#036C44] transition-all duration-200"
          >
            <div>
              <p className="font-semibold">{user?.role || 'Admin'}</p>
              <p className="text-sm text-gray-300">{user?.email || 'No email'}</p>
            </div>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BSidebar;