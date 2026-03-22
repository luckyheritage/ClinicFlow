import { students, admins, AdminRole } from "./data";

export type UserRole = "student" | "admin";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  adminRole?: AdminRole;
  serviceId?: string;
}

export function authenticate(loginId: string): AuthUser | null {
  const upper = loginId.trim().toUpperCase();
  
  const student = students.find((s) => s.id === upper);
  if (student) {
    return { id: student.id, firstName: student.firstName, lastName: student.lastName, role: "student" };
  }

  const admin = admins.find((a) => a.id === upper);
  if (admin) {
    return { id: admin.id, firstName: admin.firstName, lastName: admin.lastName, role: "admin", adminRole: admin.role, serviceId: admin.serviceId };
  }

  return null;
}

export function getStoredUser(): AuthUser | null {
  const data = localStorage.getItem("clinicflow_user");
  return data ? JSON.parse(data) : null;
}

export function storeUser(user: AuthUser) {
  localStorage.setItem("clinicflow_user", JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem("clinicflow_user");
}
