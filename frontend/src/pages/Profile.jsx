import React, { useState, useEffect} from "react";
import API from "../api/api";

const Profile = () => {
  const [edit, setEdit] = useState(false);

const [form, setForm] = useState({
  email: "",
  company: "",
  industry: "",
  location: ""
});



const handleSave = async () => {
  try {
    await API.put("/api/profile", {
      company: form.company,
      industry: form.industry,
      location: form.location
    });

    setEdit(false);
    alert("Profile updated successfully");

  } catch {
    alert("Update failed");
  }
};

  useEffect(() => {
  API.get("/api/profile")
    .then(res => {
      setForm(res.data);
    })
    .catch(() => {
      alert("Failed to load profile");
    });
}, []);

  return (
    <div className="page">
      <h1>Profile</h1>

      {/* USER INFO */}
      <div className="card">
        <h3>User Information</h3>

        <label>Email</label>
        <input
          disabled
          value={form.email}
          className="input"
        />

        <label>Company</label>
        <input
          disabled={!edit}
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="input"
        />

        <label>Industry</label>
        <input
          disabled={!edit}
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
          className="input"
        />

        <label>Location</label>
        <input
          disabled={!edit}
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="input"
        />

        {!edit ? (
          <button className="btn" onClick={() => setEdit(true)}>
            Edit Profile
          </button>
        ) : (
          <button className="btn" onClick={handleSave}>
            Save Changes
          </button>
        )}
      </div>

      {/* SECURITY */}
      <div className="card">
        <h3>Security</h3>
        <p>Password management coming soon</p>
        <button className="btn-secondary">Change Password</button>
      </div>

      {/* SYSTEM INFO */}
      <div className="card">
        <h3>System Access</h3>
        <p>Role: Industry User</p>
        <p>Status: Active</p>
      </div>
    </div>
  );
};

export default Profile;