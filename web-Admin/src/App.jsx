import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import {AppAdminLayout, BranchAdminLayout} from "./layout/AdminsLayout";

function App() {
  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route path="/" element={<Login />} />

        {/* Admin Routes */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute allowedRole="AppAdmin">
              <AppAdminLayout />
            </ProtectedRoute>
          } 
        />

        {/* Branch Admin Routes */}
        <Route 
          path="/branch-admin/*" 
          element={
            <ProtectedRoute allowedRole="BranchAdmin">
              <BranchAdminLayout />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
