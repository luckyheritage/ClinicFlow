export interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Admin {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Appointment {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string;
  service: string;
  complaint: string;
  phone?: string;
  email?: string;
  isEmergency: boolean;
  status: "confirmed" | "cancelled" | "rescheduled";
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: "confirmation" | "reminder" | "rescheduled" | "cancelled" | "emergency";
  read: boolean;
  createdAt: string;
}

export const students: Student[] = [
  { id: "CF001", firstName: "Heritage", lastName: "Lucky" },
  { id: "CF002", firstName: "Chinedu", lastName: "Eze" },
  { id: "CF003", firstName: "Amina", lastName: "Bello" },
  { id: "CF004", firstName: "David", lastName: "Adeyemi" },
  { id: "CF005", firstName: "Precious", lastName: "Nwankwo" },
  { id: "CF006", firstName: "Samuel", lastName: "Ogunleye" },
  { id: "CF007", firstName: "Esther", lastName: "Okafor" },
  { id: "CF008", firstName: "Michael", lastName: "Ibrahim" },
  { id: "CF009", firstName: "Grace", lastName: "Olatunji" },
  { id: "CF010", firstName: "Daniel", lastName: "Musa" },
  { id: "CF011", firstName: "Fatima", lastName: "Sadiq" },
  { id: "CF012", firstName: "Joshua", lastName: "Balogun" },
  { id: "CF013", firstName: "Blessing", lastName: "Uche" },
  { id: "CF014", firstName: "Ibrahim", lastName: "Lawal" },
  { id: "CF015", firstName: "Joy", lastName: "Ekanem" },
  { id: "CF016", firstName: "Emmanuel", lastName: "Obi" },
  { id: "CF017", firstName: "Patience", lastName: "Danjuma" },
  { id: "CF018", firstName: "Sadiq", lastName: "Abdullahi" },
  { id: "CF019", firstName: "Ruth", lastName: "Onyekachi" },
  { id: "CF020", firstName: "Victor", lastName: "Etim" },
];

export const admins: Admin[] = [
  { id: "ADMIN01", firstName: "Dr. Folake", lastName: "Adeniyi" },
  { id: "ADMIN02", firstName: "Dr. Kunle", lastName: "Obaseki" },
  { id: "ADMIN03", firstName: "Nurse Aisha", lastName: "Yusuf" },
  { id: "ADMIN04", firstName: "Dr. Ngozi", lastName: "Okeke" },
  { id: "ADMIN05", firstName: "Pharm. Tunde", lastName: "Bakare" },
];

export const services = [
  { id: "general", label: "General Consultation", icon: "Stethoscope" },
  { id: "laboratory", label: "Laboratory Services", icon: "FlaskConical" },
  { id: "dental", label: "Dental Services", icon: "SmilePlus" },
  { id: "optometry", label: "Optometry Services", icon: "Eye" },
  { id: "pharmacy", label: "Pharmacy", icon: "Pill" },
] as const;

export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  let hour = 8;
  let minute = 0;
  while (hour < 15 || (hour === 15 && minute === 0)) {
    const h = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${ampm}`;
    slots.push(display);
    minute += 20;
    if (minute >= 60) {
      minute -= 60;
      hour += 1;
    }
  }
  return slots;
}

export function generateBookingId(): string {
  return `CF-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function getStoredAppointments(): Appointment[] {
  const data = localStorage.getItem("clinicflow_appointments");
  return data ? JSON.parse(data) : [];
}

export function saveAppointments(appointments: Appointment[]) {
  localStorage.setItem("clinicflow_appointments", JSON.stringify(appointments));
}

export function getStoredNotifications(): Notification[] {
  const data = localStorage.getItem("clinicflow_notifications");
  return data ? JSON.parse(data) : [];
}

export function saveNotifications(notifications: Notification[]) {
  localStorage.setItem("clinicflow_notifications", JSON.stringify(notifications));
}

export function addNotification(userId: string, message: string, type: Notification["type"]) {
  const notifications = getStoredNotifications();
  notifications.unshift({
    id: crypto.randomUUID(),
    userId,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveNotifications(notifications);
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 6; // Mon-Sat
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Seed demo appointments
export function seedDemoData() {
  const existing = getStoredAppointments();
  if (existing.length > 0) return;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  const demoAppointments: Appointment[] = [
    { id: "CF-1001", studentId: "CF001", studentName: "Heritage Lucky", date: todayStr, timeSlot: "08:00 AM", service: "General Consultation", complaint: "Headache and mild fever", isEmergency: false, status: "confirmed", createdAt: new Date().toISOString() },
    { id: "CF-1002", studentId: "CF003", studentName: "Amina Bello", date: todayStr, timeSlot: "08:40 AM", service: "Laboratory Services", complaint: "Blood test required", isEmergency: false, status: "confirmed", createdAt: new Date().toISOString() },
    { id: "CF-1003", studentId: "CF005", studentName: "Precious Nwankwo", date: todayStr, timeSlot: "09:20 AM", service: "Dental Services", complaint: "Toothache", isEmergency: false, status: "confirmed", createdAt: new Date().toISOString() },
    { id: "CF-1004", studentId: "CF008", studentName: "Michael Ibrahim", date: todayStr, timeSlot: "10:00 AM", service: "General Consultation", complaint: "Severe stomach pain", isEmergency: true, status: "confirmed", createdAt: new Date().toISOString() },
    { id: "CF-1005", studentId: "CF010", studentName: "Daniel Musa", date: todayStr, timeSlot: "11:00 AM", service: "Optometry Services", complaint: "Eye checkup", isEmergency: false, status: "confirmed", createdAt: new Date().toISOString() },
  ];

  saveAppointments(demoAppointments);
}
