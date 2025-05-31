import ASidebar from "../components/ASideBar";
import LayoutB from "../components/LayoutB";
import LayoutA from "../components/LayoutA";

import AdminDashboard from "../pages/AppAdmin/Admindashboard";
import ManageHeads from "../pages/AppAdmin/ManageHeads";
import ManageBranch from "../pages/AppAdmin/ManageBranch"
import BranchAdminDashboard from "../pages/BranchAdmin/BranchAdminDashboard";
import ManageCourses from "../pages/BranchAdmin/ManageCourses";
import StudentsLists from "../pages/BranchAdmin/StudentLists";
import Manageteachers from "../pages/BranchAdmin/ManageTeacher";
import ManageSessions from "../pages/BranchAdmin/ManageSessions";
import AcademicPeriod from "../pages/AppAdmin/AcademicPeriod";

import { Routes, Route } from "react-router-dom";

// ✅ Export Admin Layout Separately
export const AppAdminLayout = () => {
  return (
    <LayoutA>
    <div className="flex h-screen">
      
      <div className="flex-1">
        <div className="p-6">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="manage-heads" element={<ManageHeads />} />
            <Route path="Manage-branch" element={<ManageBranch />} />
            <Route path="academic-period" element={<AcademicPeriod />} />
          </Routes>
        </div>
      </div>
    </div>
    </LayoutA>
  );
};

// ✅ Export Branch Admin Layout Separately
export const BranchAdminLayout = () => {
  return (
    <LayoutB>
    <div className="flex h-screen">
      
      <div className="flex-1">
        <div className="p-6">
          <Routes>
            <Route path="/" element={<BranchAdminDashboard />} />
            <Route path="manage-courses" element={<ManageCourses />} />
            <Route path="student-lists" element={<StudentsLists />} />
            <Route path="teacher-management" element={<Manageteachers />} />
            <Route path="manage-sessions" element={<ManageSessions />} />
            
          </Routes>
        </div>
      </div>
    </div>
    </LayoutB>
  );
};
