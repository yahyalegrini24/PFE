/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { Loader2, Trash } from "lucide-react";
import supabase from "../../utils/Supabase";

export default function AddBranch() {
  const [branchName, setBranchName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [branches, setBranches] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  async function fetchBranches() {
    try {
      const { data, error } = await supabase
        .from('Branch')
        .select('*')
        .order('branchName', { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
      alert("Failed to load branches");
    }
  }

  function generateBranchId(name) {
    const words = name.trim().split(/\s+/);
    
    if (words.length >= 2) {
      // Two or more words: first 2 letters from first word + first letter from second word
      const firstPart = words[0].substring(0, 2).toUpperCase();
      const secondPart = words[1].substring(0, 1).toUpperCase();
      return `${firstPart}${secondPart}-G-24`;
    } else {
      // Single word: first 3 letters
      const prefix = words[0].substring(0, 3).toUpperCase();
      return `${prefix}-G-24`;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!branchName.trim()) return;

    setLoading(true);
    setSuccess(false);

    try {
      const branchId = generateBranchId(branchName);

      // Check if branch name already exists (case insensitive)
      const { data: existingBranches, error: checkError } = await supabase
        .from('Branch')
        .select('branchName')
        .ilike('branchName', branchName.trim());

      if (existingBranches && existingBranches.length > 0) {
        throw new Error('A branch with this exact name already exists');
      }

      // Check if generated ID already exists
      const { data: existingId, error: idError } = await supabase
        .from('Branch')
        .select('branchId')
        .eq('branchId', branchId);

      if (existingId && existingId.length > 0) {
        throw new Error('Generated ID already exists. Try a more unique branch name.');
      }

      // Insert new branch
      const { error } = await supabase
        .from('Branch')
        .insert([{ 
          branchId,
          branchName: branchName.trim()
        }]);

      if (error) throw error;

      // Success
      setBranchName("");
      setSuccess(true);
      fetchBranches(); // Refresh the list
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(branchId) {
    if (!window.confirm("Are you sure you want to delete this branch?")) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('Branch')
        .delete()
        .eq('branchId', branchId);

      if (error) throw error;

      // Refresh the branch list
      fetchBranches();
    } catch (error) {
      alert("Failed to delete branch: " + error.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Branch Management</h2>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Add Branch Form */}
        <div className="w-full md:w-1/2">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Add New Branch</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Generated ID: {branchName ? generateBranchId(branchName) : "XXX-G-24"}
                  <br />
                  {branchName && branchName.trim().split(/\s+/).length >= 2 ? (
                    <span className="text-xs">(First 2 letters from first word + first letter from second word)</span>
                  ) : (
                    <span className="text-xs">(First 3 letters from the word)</span>
                  )}
                </p>
              </div>

              <button
                type="submit"
                className="w-full p-2 bg-[#1E293B] text-white rounded-lg hover:bg-[#1E293B] transition flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} /> Adding...
                  </>
                ) : (
                  "Add Branch"
                )}
              </button>

              {success && (
                <div className="p-2 bg-green-100 text-green-700 rounded-lg text-center text-sm">
                  Branch added successfully!
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Branches List */}
        <div className="w-full md:w-1/2">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Existing Branches</h3>
            
            {branches.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No branches added yet</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">ID</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => (
                      <tr key={branch.branchId} className="border-b hover:bg-gray-100">
                        <td className="p-2">{branch.branchName}</td>
                        <td className="p-2">{branch.branchId}</td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDelete(branch.branchId)}
                            className="text-red-500 hover:text-red-700 p-1"
                            disabled={deleteLoading}
                            title="Delete branch"
                          >
                            <Trash size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}