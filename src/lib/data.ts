export interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  serviceId: string; // which service they handle
}

export type AdminRole = "doctor" | "nurse" | "receptionist" | "optician" | "dentist" | "lab_scientist" | "pharmacist";

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
  assignedAdminId: string;
  assignedAdminName: string;
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
  // 2 Doctors - General Consultation
  { id: "ADMIN01", firstName: "Dr. Folake", lastName: "Adeniyi", role: "doctor", serviceId: "general" },
  { id: "ADMIN02", firstName: "Dr. Kunle", lastName: "Obaseki", role: "doctor", serviceId: "general" },
  // 2 Nurses - General Consultation (assist doctors)
  { id: "ADMIN03", firstName: "Nurse Aisha", lastName: "Yusuf", role: "nurse", serviceId: "general" },
  { id: "ADMIN04", firstName: "Nurse Chioma", lastName: "Nwosu", role: "nurse", serviceId: "general" },
  // 1 Receptionist - all services (verification)
  { id: "ADMIN05", firstName: "Mrs. Funmi", lastName: "Adebayo", role: "receptionist", serviceId: "all" },
  // 1 Optician - Optometry
  { id: "ADMIN06", firstName: "Dr. Ngozi", lastName: "Okeke", role: "optician", serviceId: "optometry" },
  // 1 Dentist - Dental
  { id: "ADMIN07", firstName: "Dr. Emeka", lastName: "Udoh", role: "dentist", serviceId: "dental" },
  // 2 Lab Scientists - Laboratory
  { id: "ADMIN08", firstName: "Mr. Tunde", lastName: "Bakare", role: "lab_scientist", serviceId: "laboratory" },
  { id: "ADMIN09", firstName: "Mrs. Halima", lastName: "Suleiman", role: "lab_scientist", serviceId: "laboratory" },
  // 1 Pharmacist - Pharmacy
  { id: "ADMIN10", firstName: "Pharm. Bola", lastName: "Fashola", role: "pharmacist", serviceId: "pharmacy" },
];

export const services = [
  { id: "general", label: "General Consultation", icon: "Stethoscope" },
  { id: "laboratory", label: "Laboratory Services", icon: "FlaskConical" },
  { id: "dental", label: "Dental Services", icon: "SmilePlus" },
  { id: "optometry", label: "Optometry Services", icon: "Eye" },
  { id: "pharmacy", label: "Pharmacy", icon: "Pill" },
] as const;

export const labSampleTypes = [
  "Blood Sample",
  "Urine Sample",
  "Stool Sample",
  "Sputum Sample",
  "Swab Sample",
  "Other",
] as const;

export const dentalVisitTypes = [
  "Routine Checkup",
  "Toothache / Pain",
  "Braces Fitting",
  "Tooth Extraction",
  "Teeth Cleaning",
  "Gum Disease",
  "Other",
] as const;

export const optometryVisitTypes = [
  "Eye Examination",
  "New Glasses Fitting",
  "Contact Lens Fitting",
  "Eye Infection / Irritation",
  "Follow-up Visit",
  "Other",
] as const;

export const pharmacyVisitTypes = [
  "Prescription Refill",
  "New Prescription Pickup",
  "Over-the-Counter Medication",
  "Drug Consultation",
  "Other",
] as const;

export const emergencyTypes = [
  "Accident / Injury",
  "Severe Allergic Reaction",
  "Fracture / Broken Bone",
  "High Fever",
  "Difficulty Breathing",
  "Chest Pain",
  "Severe Bleeding",
  "Loss of Consciousness",
  "Seizure / Convulsion",
  "Severe Abdominal Pain",
  "Burns",
  "Poisoning / Overdose",
  "Other",
] as const;

export const adminRoleLabels: Record<AdminRole, string> = {
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  optician: "Optician",
  dentist: "Dentist",
  lab_scientist: "Lab Scientist",
  pharmacist: "Pharmacist",
};

/** Get the admins who handle a given service */
export function getAdminsForService(serviceLabel: string): Admin[] {
  const svc = services.find((s) => s.label === serviceLabel);
  if (!svc) return [];
  return admins.filter((a) => a.serviceId === svc.id && a.role !== "receptionist");
}

/** Auto-assign a clinician: pick the one with fewest bookings for that date+service */
export function assignClinician(serviceLabel: string, date: string, isEmergency = false): Admin | null {
  let eligible = getAdminsForService(serviceLabel);
  // For emergencies, only doctors can attend
  if (isEmergency) {
    eligible = eligible.filter((a) => a.role === "doctor");
  }
  if (eligible.length === 0) return null;

  const appointments = getStoredAppointments();
  const daySvcAppts = appointments.filter(
    (a) => a.date === date && a.service === serviceLabel && a.status === "confirmed"
  );

  // Count bookings per admin
  const counts = new Map<string, number>();
  eligible.forEach((a) => counts.set(a.id, 0));
  daySvcAppts.forEach((a) => {
    counts.set(a.assignedAdminId, (counts.get(a.assignedAdminId) || 0) + 1);
  });

  // Pick admin with fewest
  let minAdmin = eligible[0];
  let minCount = counts.get(eligible[0].id) || 0;
  for (const admin of eligible) {
    const c = counts.get(admin.id) || 0;
    if (c < minCount) {
      minCount = c;
      minAdmin = admin;
    }
  }
  return minAdmin;
}

/** Check if a specific slot is available for a given admin on a date */
export function isSlotAvailableForAdmin(adminId: string, date: string, timeSlot: string): boolean {
  const appointments = getStoredAppointments();
  return !appointments.some(
    (a) => a.date === date && a.timeSlot === timeSlot && a.assignedAdminId === adminId && a.status === "confirmed"
  );
}

/** Get booked slots for a service on a date (a slot is "full" only if ALL eligible staff are booked) */
export function getFullyBookedSlots(serviceLabel: string, date: string): string[] {
  const eligible = getAdminsForService(serviceLabel);
  if (eligible.length === 0) return [];

  const appointments = getStoredAppointments();
  const daySvcAppts = appointments.filter(
    (a) => a.date === date && a.service === serviceLabel && a.status === "confirmed"
  );

  const slots = generateTimeSlots();
  const fullyBooked: string[] = [];

  for (const slot of slots) {
    const allBusy = eligible.every((admin) =>
      daySvcAppts.some((a) => a.timeSlot === slot && a.assignedAdminId === admin.id)
    );
    if (allBusy) fullyBooked.push(slot);
  }

  return fullyBooked;
}

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

/** Check if an appointment's time has elapsed */
export function isAppointmentElapsed(appt: Appointment): boolean {
  const now = new Date();
  const [timePart, ampm] = appt.timeSlot.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let hour = parseInt(hStr, 10);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const apptDate = new Date(appt.date + "T00:00:00");
  apptDate.setHours(hour, parseInt(mStr, 10) + 20, 0); // +20 min for slot duration
  return now > apptDate;
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
    { id: "CF-1001", studentId: "CF001", studentName: "Heritage Lucky", date: todayStr, timeSlot: "08:00 AM", service: "General Consultation", complaint: "Headache and mild fever", isEmergency: false, status: "confirmed", assignedAdminId: "ADMIN01", assignedAdminName: "Dr. Folake Adeniyi", createdAt: new Date().toISOString() },
    { id: "CF-1002", studentId: "CF003", studentName: "Amina Bello", date: todayStr, timeSlot: "08:40 AM", service: "Laboratory Services", complaint: "Blood Sample - Routine blood test", isEmergency: false, status: "confirmed", assignedAdminId: "ADMIN08", assignedAdminName: "Mr. Tunde Bakare", createdAt: new Date().toISOString() },
    { id: "CF-1003", studentId: "CF005", studentName: "Precious Nwankwo", date: todayStr, timeSlot: "09:20 AM", service: "Dental Services", complaint: "Toothache", isEmergency: false, status: "confirmed", assignedAdminId: "ADMIN07", assignedAdminName: "Dr. Emeka Udoh", createdAt: new Date().toISOString() },
    { id: "CF-1004", studentId: "CF008", studentName: "Michael Ibrahim", date: todayStr, timeSlot: "10:00 AM", service: "General Consultation", complaint: "Severe stomach pain", isEmergency: true, status: "confirmed", assignedAdminId: "ADMIN02", assignedAdminName: "Dr. Kunle Obaseki", createdAt: new Date().toISOString() },
    { id: "CF-1005", studentId: "CF010", studentName: "Daniel Musa", date: todayStr, timeSlot: "11:00 AM", service: "Optometry Services", complaint: "Eye checkup", isEmergency: false, status: "confirmed", assignedAdminId: "ADMIN06", assignedAdminName: "Dr. Ngozi Okeke", createdAt: new Date().toISOString() },
  ];

  saveAppointments(demoAppointments);
}
