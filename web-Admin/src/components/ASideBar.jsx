/* eslint-disable no-unused-vars */
import { Link } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext"; // Adjust the import path as needed

const ASidebar = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    // You might want to redirect after logout
    // navigate('/login');
  };

  return (
    <div className="w-64 bg-[#1E293B] text-white h-screen p-5 shadow-xl flex flex-col">
      {/* Sidebar Header */}
      <h2 className="text-xl font-semibold mb-6 text-center tracking-wide border-b border-gray-600 pb-3">
        Admin Panel
      </h2>

      {/* Sidebar Navigation */}
      <nav className="flex-1 space-y-1">
        {[
          { to: "/admin", label: "Dashboard", Icon: LayoutDashboard },
          { to: "/admin/manage-heads", label: "Manage Heads", Icon: Users },
          { to: "/admin/manage-branch", label: "Manage Branch", Icon: Users },
          { to: "/admin/academic-period", label: "Academic Period", Icon: Calendar },
        ].map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-[#334155] hover:pl-5"
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Admin Info & Logout */}
      <div className="mt-auto border-t border-gray-600 pt-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-[#334155] transition-all duration-200"
        >
          <div>
            <p className="font-semibold">{user?.role || 'Admin'}</p>
            <p className="text-sm text-gray-300">{user?.email || 'No email'}</p>
          </div>
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ASidebar;