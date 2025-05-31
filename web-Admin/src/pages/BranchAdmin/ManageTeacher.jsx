/* eslint-disable no-unused-vars */
import { useState, useEffect ,useContext} from "react";
import { Eye, EyeOff, Clipboard, Check, Trash, Loader2 } from "lucide-react";
import supabase from "../../utils/Supabase";
import { useAuth } from "../../context/AuthContext";

export default function ManageTeacher() {
  const {user} = useAuth()
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  useEffect(() => {
    fetchTeachers();
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email) return;

    setLoading(true);

    try {
      // 1. Create auth user first to get the UID
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'teacher'
          }
        }
      });

      if (authError) throw authError;

      // 2. Create teacher record using auth UID as teacherId
      const { data: teacherData, error: dbError } = await supabase
        .from('Teacher')
        .insert([
          { 
            teacherId: authData.user.id, // Using auth UID as teacherId
            email, 
            name,
            branchId:user.branchId
          }
        ])
        .select();

      if (dbError) throw dbError;

      // 3. Update UI
      setTeachers([...teachers, { 
        teacherId: authData.user.id, 
        name, 
        email 
      }]);

      // Store credentials for printing
      setLastCreated({ name, email, password });

      // Reset form
      setName("");
      setEmail("");
      setPassword(generatePassword());
    } catch (error) {
      console.error("Error creating teacher:", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }
 
  async function fetchTeachers() {
    try {
      const { data, error } = await supabase
        .from('Teacher')
        .select('teacherId, name, email')
        .order('name', { ascending: true });

      if (error) throw error;
      
      setTeachers(data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  }

  async function handleDelete(teacherId) {
    if (!window.confirm("Are you sure you want to delete this teacher?")) return;
    
    setLoading(true);

    try {
      // 1. Delete from Teacher table
      const { error: dbError } = await supabase
        .from('Teacher')
        .delete()
        .eq('teacherId', teacherId);

      if (dbError) throw dbError;

      // 2. Delete from authentication (requires admin privileges)
      // Note: This requires the 'service_role' key in a secure environment
      const { error: authError } = await supabase.auth.admin.deleteUser(teacherId);
      if (authError) console.warn("Auth user not deleted:", authError.message);

      // 3. Update UI
      setTeachers(teachers.filter((teacher) => teacher.teacherId !== teacherId));
    } catch (error) {
      console.error("Error deleting teacher:", error);
      alert("Teacher record deleted but auth user may still exist. Contact admin.");
    } finally {
      setLoading(false);
    }
  }

  // Add this function to print credentials
  function handlePrintCredentials() {
    if (!lastCreated) return;
    const printWindow = window.open('', '', 'width=400,height=400');
    printWindow.document.write(`
      <html>
        <head><title>Teacher Credentials</title></head>
        <body>
          <h2>Teacher Credentials</h2>
          <p><strong>Name:</strong> ${lastCreated.name}</p>
          <p><strong>Email:</strong> ${lastCreated.email}</p>
          <p><strong>Password:</strong> ${lastCreated.password}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Manage Teachers</h2>

      <div className="flex gap-6">
        {/* Left Section: Form */}
        <div className="w-1/2 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Create Teacher Account</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                className="w-full p-2 mt-1 border rounded-lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
              className="w-full p-2 bg-[#036C44] text-white rounded-lg hover:bg-[#025a37] transition flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Creating...
                </>
              ) : (
                "Create Teacher Account"
              )}
            </button>
          </form>

          {/* Add this after the form, before the teacher list */}
          {lastCreated && (
            <div className="my-4 flex justify-center">
              <button
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                onClick={handlePrintCredentials}
              >
                Print Last Created Credentials
              </button>
            </div>
          )}
        </div>

        {/* Right Section: Teacher List */}
        <div className="w-1/2 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Teacher List</h3>

          {teachers.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto space-y-3">
              {teachers.map((teacher) => (
                <li
                  key={teacher.teacherId}
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                >
                  <div>
                    <p className="font-medium">{teacher.name}</p>
                    <p className="text-sm text-gray-600">{teacher.email}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(teacher.teacherId)} 
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    <Trash size={18} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No teachers added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}