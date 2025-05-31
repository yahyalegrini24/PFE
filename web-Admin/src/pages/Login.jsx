import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Loader2 } from "lucide-react";
import supabase from "../utils/Supabase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
   

    try {
      // 1. Supabase Authentication
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!supabaseUser) throw new Error("Authentication failed");

      // 2. Check Admin Privileges in Supabase
      const { data: adminData, error: supabaseError } = await supabase
        .from('Admins')
        .select('*')
        .eq('user_id', supabaseUser.id) // Now using Supabase's user.id
        .maybeSingle();
      
      if (supabaseError) throw supabaseError;

      // 3. Verify Admin Exists
      if (!adminData) {
        await supabase.auth.signOut();
        throw new Error("No admin privileges found for this account");
      }

      // 5. Login Successful
      login({
        uid: supabaseUser.id,
        email: adminData.email,
        role: adminData.role,
        branchId: adminData.branchId
      });

      // 6. Redirect Based on Role
      navigate(adminData.role === "BranchAdmin" ? "/branch-admin" : "/admin"); // Redirect based on role
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#006633]">
          Admin Login
        </h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error.includes('privileges') ? (
              <>
                <p>{error}</p>
                <p className="mt-2">
                  Contact support at <a href="mailto:admin@yourdomain.com" className="underline">admin@yourdomain.com</a>
                </p>
              </>
            ) : (
              error
            )}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006633] focus:border-transparent"
                required
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006633] focus:border-transparent"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#006633] text-white py-2 px-4 rounded-lg hover:bg-[#005522] focus:outline-none focus:ring-2 focus:ring-[#006633] focus:ring-offset-2 transition-all flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;