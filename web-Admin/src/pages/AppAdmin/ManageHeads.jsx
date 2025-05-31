/* eslint-disable no-unused-vars */
import { useState, useEffect, useContext } from "react";
import { Eye, EyeOff, Clipboard, Check, Trash, Loader2 } from "lucide-react";
import supabase from "../../utils/Supabase";
import { useAuth } from "../../context/AuthContext";

export default function ManageHeads() {
  const { user } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  useEffect(() => {
    fetchAdmins();
    fetchBranches();
  }, []);

  function generatePassword(length = 12) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  }

  function handleGeneratePassword() {
    setPassword(generatePassword());
  }

  function handleCopyPassword() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function fetchBranches() {
    try {
      const { data, error } = await supabase
        .from('Branch')
        .select('branchId, branchName')
        .order('branchName', { ascending: true });

      if (error) throw error;
      
      setBranches(data || []);
      if (data.length > 0) {
        setSelectedBranch(data[0].branchId);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }

  async function fetchAdmins() {
    try {
      const { data, error } = await supabase
        .from('Admins')
        .select(`
          user_id, 
          email, 
          role, 
          branchId,
          Branch (branchName)
        `)
        .order('email', { ascending: true });

      if (error) throw error;
      
      setAdmins(data || []);
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !selectedBranch) return;

    setLoading(true);

    try {
      // 1. Create auth user first to get the UID
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'BranchAdmin'
          }
        }
      });

      if (authError) throw authError;

      // 2. Create admin record using auth UID as user_id
      const { data: adminData, error: dbError } = await supabase
        .from('Admins')
        .insert([
          { 
            user_id: authData.user.id,
            email,
            role: 'BranchAdmin',
            branchId: selectedBranch
          }
        ])
        .select();

      if (dbError) throw dbError;

      // 3. Update UI
      const newAdmin = {
        user_id: authData.user.id,
        email,
        role: 'BranchAdmin',
        branchId: selectedBranch,
        Branch: branches.find(b => b.branchId === selectedBranch)
      };
      
      setAdmins([...admins, newAdmin]);

      // Reset form
      setEmail("");
      setPassword(generatePassword());
    } catch (error) {
      console.error("Error creating admin:", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;
    
    setLoading(true);

    try {
      // 1. Delete from Admins table
      const { error: dbError } = await supabase
        .from('Admins')
        .delete()
        .eq('user_id', userId);

      if (dbError) throw dbError;

      // 2. Delete from authentication (requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) console.warn("Auth user not deleted:", authError.message);

      // 3. Update UI
      setAdmins(admins.filter((admin) => admin.user_id !== userId));
    } catch (error) {
      console.error("Error deleting admin:", error);
      alert("Admin record deleted but auth user may still exist. Contact admin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Manage Branch Admins</h2>

      <div className="flex gap-6">
        {/* Left Section: Form */}
        <div className="w-1/2 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Create Admin Account</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="w-full p-2 mt-1 border rounded-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Branch</label>
              <select
                className="w-full p-2 mt-1 border rounded-lg"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                required
              >
                {branches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.branchName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Generated Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full p-2 pr-10 border rounded-lg"
                  value={password}
                  readOnly
                />
                <button
                  type="button"
                  className="absolute right-10 p-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>

                <button type="button" className="absolute right-2 p-2" onClick={handleCopyPassword}>
                  {copied ? <Check size={20} className="text-green-600" /> : <Clipboard size={20} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="w-full p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              onClick={handleGeneratePassword}
            >
              Generate New Password
            </button>

            <button
              type="submit"
              className="w-full p-2 bg-[#1E293B] text-white rounded-lg hover:bg-[#025a37] transition flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Creating...
                </>
              ) : (
                "Create Admin Account"
              )}
            </button>
          </form>
        </div>

        {/* Right Section: Admin List */}
        <div className="w-1/2 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Admins List</h3>

          {admins.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto space-y-3">
              {admins.map((admin) => (
                <li
                  key={admin.user_id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                >
                  <div>
                    <p className="font-medium">{admin.Branch?.branchName || 'No branch'}</p>
                    <p className="text-sm text-gray-600">{admin.email}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(admin.user_id)} 
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    <Trash size={18} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No admins added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}