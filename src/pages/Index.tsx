import React, { useState, useEffect } from "react";
import { AuthUser, getStoredUser, clearUser } from "@/lib/auth";
import { seedDemoData } from "@/lib/data";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";
import AdminDashboard from "@/components/AdminDashboard";

const Index = () => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    seedDemoData();
    const stored = getStoredUser();
    if (stored) setUser(stored);
  }, []);

  const handleLogout = () => {
    clearUser();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  if (user.role === "admin") {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <StudentDashboard user={user} onLogout={handleLogout} />;
};

export default Index;
