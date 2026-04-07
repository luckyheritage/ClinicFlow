import React, { useState, useMemo } from "react";
import { AuthUser } from "@/lib/auth";
import {
  Appointment, generateTimeSlots, generateBookingId, getStoredAppointments,
  saveAppointments, addNotification, services, isWeekday, formatDate,
  getStoredNotifications, saveNotifications, labSampleTypes,
  dentalVisitTypes, optometryVisitTypes, pharmacyVisitTypes, emergencyTypes,
  assignClinician, getFullyBookedSlots, isAppointmentElapsed,
} from "@/lib/data";
import StepIndicator from "./StepIndicator";
import Header from "./Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarIcon, Stethoscope, FlaskConical, SmilePlus, Eye, Pill,
  AlertTriangle, Clock, CheckCircle2, ArrowLeft, ArrowRight, Download,
} from "lucide-react";

const serviceIcons: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="w-6 h-6" />,
  FlaskConical: <FlaskConical className="w-6 h-6" />,
  SmilePlus: <SmilePlus className="w-6 h-6" />,
  Eye: <Eye className="w-6 h-6" />,
  Pill: <Pill className="w-6 h-6" />,
};

interface StudentDashboardProps {
  user: AuthUser;
  onLogout: () => void;
  preselectedDate?: string;
  preselectedSlot?: string;
}

const STEPS = ["Service", "Emergency", "Time", "Details", "Confirm"];
const EMERGENCY_STEPS = ["Service", "Emergency", "Triage", "Details", "Confirm"];

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user, onLogout, preselectedDate, preselectedSlot,
}) => {
  const [view, setView] = useState<"home" | "book" | "queue" | "myAppointments" | "notifications">("home");
  const [refreshKey, setRefreshKey] = useState(0);
  const [queueDate, setQueueDate] = useState<Date>(new Date());
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    preselectedDate ? new Date(preselectedDate + "T00:00:00") : undefined
  );
  const [selectedSlot, setSelectedSlot] = useState(preselectedSlot || "");
  const [complaint, setComplaint] = useState("");
  const [selectedSampleType, setSelectedSampleType] = useState("");
  const [selectedDentalType, setSelectedDentalType] = useState("");
  const [selectedOptometryType, setSelectedOptometryType] = useState("");
  const [selectedPharmacyType, setSelectedPharmacyType] = useState("");
  const [pharmacyPrescription, setPharmacyPrescription] = useState("");
  const [selectedEmergencyTypes, setSelectedEmergencyTypes] = useState<string[]>([]);
  const [emergencyTemperature, setEmergencyTemperature] = useState("");
  const [emergencyDescription, setEmergencyDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const timeSlots = generateTimeSlots();
  const appointments = getStoredAppointments();
  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const isLabService = selectedService === "Laboratory Services";
  const isDentalService = selectedService === "Dental Services";
  const isOptometryService = selectedService === "Optometry Services";
  const isPharmacyService = selectedService === "Pharmacy";

  const bookedSlotsForDate = useMemo(
    () => selectedService ? getFullyBookedSlots(selectedService, dateStr) : [],
    [appointments, dateStr, selectedService]
  );

  const recommendedSlot = useMemo(() => {
    return timeSlots.find((s) => !bookedSlotsForDate.includes(s)) || null;
  }, [timeSlots, bookedSlotsForDate]);

  const estimatedWait = useMemo(() => {
    const booked = bookedSlotsForDate.length;
    return booked * 5;
  }, [bookedSlotsForDate]);

  const myAppointments = appointments.filter((a) => a.studentId === user.id && a.status === "confirmed" && !isAppointmentElapsed(a));

  const resetBooking = () => {
    setStep(0);
    setSelectedService("");
    setIsEmergency(false);
    setSelectedDate(undefined);
    setSelectedSlot("");
    setComplaint("");
    setSelectedSampleType("");
    setSelectedDentalType("");
    setSelectedOptometryType("");
    setSelectedPharmacyType("");
    setPharmacyPrescription("");
    setSelectedEmergencyTypes([]);
    setEmergencyTemperature("");
    setEmergencyDescription("");
    setPhone("");
    setEmail("");
    setConfirmedAppointment(null);
  };

  const buildComplaintText = (): string => {
    const parts: string[] = [];

    if (isEmergency) {
      if (selectedEmergencyTypes.length > 0) parts.push(`Emergency: ${selectedEmergencyTypes.join(", ")}`);
      if (emergencyTemperature) parts.push(`Temperature: ${emergencyTemperature}°C`);
      if (emergencyDescription) parts.push(emergencyDescription);
    }

    if (isLabService && selectedSampleType) {
      parts.push(selectedSampleType);
    } else if (isDentalService && selectedDentalType) {
      parts.push(`Dental: ${selectedDentalType}`);
    } else if (isOptometryService && selectedOptometryType) {
      parts.push(`Optometry: ${selectedOptometryType}`);
    } else if (isPharmacyService && selectedPharmacyType) {
      parts.push(`Pharmacy: ${selectedPharmacyType}`);
      if (pharmacyPrescription) parts.push(`Prescription: ${pharmacyPrescription}`);
    }

    if (complaint) parts.push(complaint);
    return parts.join(" - ") || "No details provided";
  };

  const handleBook = () => {
    let bookDate = dateStr;
    let bookSlot = selectedSlot;

    // For emergencies, auto-assign today and earliest slot if not selected
    if (isEmergency) {
      if (!bookDate) {
        bookDate = format(new Date(), "yyyy-MM-dd");
      }
      if (!bookSlot) {
        const svc = selectedService || "General Consultation";
        const fullyBooked = getFullyBookedSlots(svc, bookDate);
        bookSlot = timeSlots.find((s) => !fullyBooked.includes(s)) || timeSlots[0];
      }
    }

    if (!isEmergency && bookedSlotsForDate.includes(bookSlot)) return;

    const svc = selectedService || "General Consultation";
    const clinician = assignClinician(svc, bookDate);
    const complaintText = buildComplaintText();

    const appt: Appointment = {
      id: generateBookingId(),
      studentId: user.id,
      studentName: `${user.firstName} ${user.lastName}`,
      date: bookDate,
      timeSlot: bookSlot,
      service: svc,
      complaint: complaintText,
      phone,
      email,
      isEmergency,
      status: "confirmed",
      assignedAdminId: clinician?.id || "",
      assignedAdminName: clinician ? `${clinician.firstName} ${clinician.lastName}` : "Unassigned",
      createdAt: new Date().toISOString(),
    };

    const updated = [...appointments, appt];
    saveAppointments(updated);
    addNotification(user.id, `Appointment confirmed for ${bookSlot} on ${formatDate(bookDate)} with ${appt.assignedAdminName}. Please arrive 30 minutes early.`, "confirmation");
    if (clinician) {
      addNotification(clinician.id, `New appointment: ${user.firstName} ${user.lastName} at ${bookSlot} - ${svc}${isEmergency ? " 🚨 EMERGENCY" : ""}`, "confirmation");
    }
    if (isEmergency) {
      addNotification(clinician?.id || "ADMIN01", `🚨 Emergency: ${user.firstName} ${user.lastName} - ${complaintText}`, "emergency");
    }
    setConfirmedAppointment(appt);
    setStep(4);
  };

  const handleCancel = (apptId: string) => {
    const updated = appointments.map((a) => (a.id === apptId ? { ...a, status: "cancelled" as const } : a));
    saveAppointments(updated);
    addNotification(user.id, `Your appointment ${apptId} has been cancelled.`, "cancelled");
    setRefreshKey((k) => k + 1);
  };

  const handleBookFromQueue = (date: string, slot: string) => {
    setSelectedDate(new Date(date + "T00:00:00"));
    setSelectedSlot(slot);
    setStep(0);
    setView("book");
  };

  const handleDownloadTicket = (appt: Appointment) => {
    const ticket = `
══════════════════════════════════════
         CLINICFLOW - APPOINTMENT TICKET
══════════════════════════════════════

  Booking ID:    ${appt.id}
  Name:          ${appt.studentName}
  Matric No:     ${appt.studentId}
  Date:          ${formatDate(appt.date)}
  Time:          ${appt.timeSlot}
  Service:       ${appt.service}
  Clinician:     ${appt.assignedAdminName}
  Status:        Confirmed
  ${appt.isEmergency ? "Priority:      🚨 EMERGENCY\n" : ""}
──────────────────────────────────────
  Please arrive 30 minutes early.
  Bring your student ID card.
══════════════════════════════════════
    `.trim();

    const blob = new Blob([ticket], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ClinicFlow_Ticket_${appt.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEmergencyType = (t: string) => {
    setSelectedEmergencyTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  // Render helper for service-specific fields
  const renderServiceSpecificFields = () => {
    if (isLabService) {
      return (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Sample Type *</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {labSampleTypes.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedSampleType(st)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                    selectedSampleType === st
                      ? "gradient-primary text-primary-foreground border-transparent"
                      : "bg-card text-foreground border-border hover:border-primary"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Additional Notes (optional)</label>
            <Textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Any specific tests or information..." className="mt-1" rows={2} />
          </div>
        </>
      );
    }

    if (isDentalService) {
      return (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reason for Visit *</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {dentalVisitTypes.map((dt) => (
                <button
                  key={dt}
                  onClick={() => setSelectedDentalType(dt)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                    selectedDentalType === dt
                      ? "gradient-primary text-primary-foreground border-transparent"
                      : "bg-card text-foreground border-border hover:border-primary"
                  )}
                >
                  {dt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Additional Details (optional)</label>
            <Textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Describe any pain, symptoms, or concerns..." className="mt-1" rows={2} />
          </div>
        </>
      );
    }

    if (isOptometryService) {
      return (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reason for Visit *</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {optometryVisitTypes.map((ot) => (
                <button
                  key={ot}
                  onClick={() => setSelectedOptometryType(ot)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                    selectedOptometryType === ot
                      ? "gradient-primary text-primary-foreground border-transparent"
                      : "bg-card text-foreground border-border hover:border-primary"
                  )}
                >
                  {ot}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Additional Details (optional)</label>
            <Textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Describe any vision issues or concerns..." className="mt-1" rows={2} />
          </div>
        </>
      );
    }

    if (isPharmacyService) {
      return (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Purpose of Visit *</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {pharmacyVisitTypes.map((pt) => (
                <button
                  key={pt}
                  onClick={() => setSelectedPharmacyType(pt)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                    selectedPharmacyType === pt
                      ? "gradient-primary text-primary-foreground border-transparent"
                      : "bg-card text-foreground border-border hover:border-primary"
                  )}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>
          {(selectedPharmacyType === "Prescription Refill" || selectedPharmacyType === "New Prescription Pickup") && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground mb-1">📋 Prescription Details</p>
              <Textarea value={pharmacyPrescription} onChange={(e) => setPharmacyPrescription(e.target.value)} placeholder="List the medications on your prescription..." className="mt-1" rows={2} />
              <p className="text-xs text-muted-foreground mt-1">Please bring your prescription slip when you arrive.</p>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Additional Notes (optional)</label>
            <Textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Any allergies, concerns, or questions..." className="mt-1" rows={2} />
          </div>
        </>
      );
    }

    // General Consultation (default)
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">Symptoms / Complaint *</label>
        <Textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Describe your symptoms..." className="mt-1" rows={3} />
      </div>
    );
  };

  const canSubmitDetails = (): boolean => {
    if (isEmergency) return true; // All fields optional for emergencies
    if (isLabService) return !!selectedSampleType;
    if (isDentalService) return !!selectedDentalType;
    if (isOptometryService) return !!selectedOptometryType;
    if (isPharmacyService) return !!selectedPharmacyType;
    return !!complaint.trim();
  };

  // Home view
  if (view === "home") {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={onLogout} onNotificationsClick={() => setView("notifications")} />
        <div className="container mx-auto px-4 py-6 max-w-2xl animate-fade-in">
          <div className="gradient-primary rounded-2xl p-6 mb-6 text-primary-foreground shadow-card-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-1">{user.firstName}, Welcome to ClinicFlow</h2>
            <p className="text-sm opacity-80">Your campus health companion</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="shadow-card cursor-pointer hover:shadow-card-md transition-shadow border-0" onClick={() => { resetBooking(); setView("book"); }}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Book Appointment</h3>
                  <p className="text-xs text-muted-foreground">Schedule a clinic visit</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card cursor-pointer hover:shadow-card-md transition-shadow border-0" onClick={() => setView("queue")}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">View Queue</h3>
                  <p className="text-xs text-muted-foreground">See schedule & availability</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card cursor-pointer hover:shadow-card-md transition-shadow border-0 sm:col-span-2" onClick={() => setView("myAppointments")}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center text-success-foreground">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">My Appointments</h3>
                  <p className="text-xs text-muted-foreground">{myAppointments.length} active booking{myAppointments.length !== 1 ? "s" : ""}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Notifications view
  if (view === "notifications") {
    const allNotifs = getStoredNotifications().filter((n) => n.userId === user.id);
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={onLogout} />
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <Button variant="ghost" onClick={() => setView("home")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h2 className="text-xl font-bold mb-4 text-foreground">Notifications</h2>
          {allNotifs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {allNotifs.map((n) => (
                <Card key={n.id} className={cn("border-0 shadow-card", !n.read && "ring-2 ring-primary/20")}>
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              const notifs = getStoredNotifications().map((n) =>
                n.userId === user.id ? { ...n, read: true } : n
              );
              saveNotifications(notifs);
              setView("home");
            }}
          >
            Mark all as read
          </Button>
        </div>
      </div>
    );
  }

  // My Appointments view
  if (view === "myAppointments") {
    const active = getStoredAppointments().filter((a) => a.studentId === user.id && a.status === "confirmed" && !isAppointmentElapsed(a));
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={onLogout} />
        <div className="container mx-auto px-4 py-6 max-w-2xl animate-fade-in">
          <Button variant="ghost" onClick={() => setView("home")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h2 className="text-xl font-bold mb-4 text-foreground">My Appointments</h2>
          {active.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active appointments.</p>
          ) : (
            <div className="space-y-3">
              {active.map((a) => (
                <Card key={a.id} className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-foreground">{a.service}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(a.date)} • {a.timeSlot}</p>
                        <p className="text-xs text-muted-foreground mt-1">ID: {a.id}</p>
                        <p className="text-xs text-primary mt-1">Attending: {a.assignedAdminName}</p>
                        {a.complaint && <p className="text-xs text-muted-foreground mt-1">Details: {a.complaint}</p>}
                        {a.isEmergency && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emergency mt-1">
                            <AlertTriangle className="w-3 h-3" /> Emergency
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownloadTicket(a)}>
                          <Download className="w-3 h-3 mr-1" /> Ticket
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const appt = getStoredAppointments().find((ap) => ap.id === a.id);
                          if (appt) {
                            const allAppts = getStoredAppointments();
                            const updated = allAppts.map((ap) => (ap.id === a.id ? { ...ap, status: "rescheduled" as const } : ap));
                            saveAppointments(updated);
                            addNotification(user.id, `Appointment ${a.id} is being rescheduled.`, "rescheduled");
                            setSelectedService(appt.service);
                            setIsEmergency(appt.isEmergency);
                            setComplaint(appt.complaint);
                            setPhone(appt.phone || "");
                            setEmail(appt.email || "");
                            setSelectedDate(undefined);
                            setSelectedSlot("");
                            setStep(2);
                            setView("book");
                          }
                        }}>
                          Reschedule
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleCancel(a.id)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Queue view
  if (view === "queue") {
    const queueDateStr = format(queueDate, "yyyy-MM-dd");
    const queueAppts = getStoredAppointments().filter((a) => a.date === queueDateStr && a.status === "confirmed" && !isAppointmentElapsed(a));

    const shiftQueueDate = (days: number) => {
      const d = new Date(queueDate);
      d.setDate(d.getDate() + days);
      setQueueDate(d);
    };

    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={onLogout} />
        <div className="container mx-auto px-4 py-6 max-w-2xl animate-fade-in">
          <Button variant="ghost" onClick={() => setView("home")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => shiftQueueDate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="font-bold text-foreground">{formatDate(queueDateStr)}</p>
              <p className="text-xs text-muted-foreground">
                {queueDateStr === format(new Date(), "yyyy-MM-dd") ? "Today" : ""}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => shiftQueueDate(1)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Queue</h2>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary">Patients: {queueAppts.length}</p>
              <p className="text-xs text-muted-foreground">Avg wait: ~{queueAppts.length * 5} min</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {timeSlots.map((slot) => {
              const slotAppts = queueAppts.filter((a) => a.timeSlot === slot);
              const hasBookings = slotAppts.length > 0;
              return (
                <button
                  key={slot}
                  onClick={() => !hasBookings && handleBookFromQueue(queueDateStr, slot)}
                  className={cn(
                    "p-3 rounded-xl text-left transition-all text-sm",
                    hasBookings
                      ? "bg-destructive/10 border border-destructive/20 cursor-default"
                      : "bg-success/10 border border-success/20 hover:bg-success/20 cursor-pointer hover:shadow-card-md"
                  )}
                >
                  <p className={cn("font-semibold", hasBookings ? "text-destructive" : "text-success")}>{slot}</p>
                  {hasBookings ? (
                    slotAppts.map((a) => (
                      <p key={a.id} className="text-xs mt-0.5 truncate text-muted-foreground">{a.studentName}</p>
                    ))
                  ) : (
                    <p className="text-xs mt-0.5 truncate text-muted-foreground">Available</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Booking flow
  const currentSteps = isEmergency ? EMERGENCY_STEPS : STEPS;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} />
      <div className="container mx-auto px-4 py-6 max-w-2xl animate-fade-in">
        <Button variant="ghost" onClick={() => {
          if (step > 0 && step < 4) {
            // For emergency, skip time step (step 2) when going back from triage/details
            if (isEmergency && step === 3) setStep(2);
            else if (isEmergency && step === 2) setStep(1);
            else setStep(step - 1);
          } else {
            resetBooking();
            setView("home");
          }
        }} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> {step > 0 && step < 4 ? "Back" : "Home"}
        </Button>

        <StepIndicator steps={currentSteps} currentStep={step} />

        {/* Step 0: Service */}
        {step === 0 && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="text-lg font-bold text-foreground">Select a Service</h2>
            <div className="grid gap-3">
              {services.map((s) => (
                <Card
                  key={s.id}
                  className={cn(
                    "cursor-pointer border-0 shadow-card hover:shadow-card-md transition-all",
                    selectedService === s.label && "ring-2 ring-primary shadow-card-md"
                  )}
                  onClick={() => { setSelectedService(s.label); setStep(1); }}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground">
                      {serviceIcons[s.icon]}
                    </div>
                    <span className="font-semibold text-foreground">{s.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Emergency */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-foreground">Is this an emergency?</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={cn("cursor-pointer border-0 shadow-card hover:shadow-card-md", isEmergency && "ring-2 ring-emergency")}
                onClick={() => { setIsEmergency(true); setStep(2); }}
              >
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-emergency" />
                  <p className="font-bold text-foreground">Yes</p>
                  <p className="text-xs text-muted-foreground">High priority</p>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer border-0 shadow-card hover:shadow-card-md"
                onClick={() => { setIsEmergency(false); setStep(2); }}
              >
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p className="font-bold text-foreground">No</p>
                  <p className="text-xs text-muted-foreground">Regular visit</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Time (regular) OR Triage (emergency) */}
        {step === 2 && !isEmergency && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-foreground">Pick a Date & Time</h2>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left h-12", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => !isWeekday(date) || date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-foreground">Time Slot</label>
                  {recommendedSlot && (
                    <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
                      Recommended: {recommendedSlot}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">Estimated wait: ~{estimatedWait} min</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map((slot) => {
                    const booked = bookedSlotsForDate.includes(slot);
                    const isRecommended = slot === recommendedSlot;
                    return (
                      <button
                        key={slot}
                        disabled={booked}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          "py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all",
                          booked && "bg-muted text-muted-foreground/50 line-through cursor-not-allowed",
                          !booked && selectedSlot === slot && "gradient-primary text-primary-foreground shadow-card-md",
                          !booked && selectedSlot !== slot && "bg-card text-foreground border hover:border-primary hover:shadow-card",
                          isRecommended && !booked && selectedSlot !== slot && "border-success ring-1 ring-success/30"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {selectedSlot && (
                  <Button className="w-full mt-4 gradient-primary hover:opacity-90" onClick={() => setStep(3)}>
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Emergency Triage */}
        {step === 2 && isEmergency && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-emergency/10 border border-emergency/20 rounded-xl p-4">
              <h2 className="text-lg font-bold text-emergency flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Emergency Triage
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                All fields are optional. Fill in what you can — even if you can't complete this form, please come to the clinic immediately.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">What type of emergency? (select all that apply)</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {emergencyTypes.map((et) => (
                  <button
                    key={et}
                    onClick={() => toggleEmergencyType(et)}
                    className={cn(
                      "py-2 px-3 rounded-lg text-sm font-medium border transition-all text-left",
                      selectedEmergencyTypes.includes(et)
                        ? "bg-emergency/10 text-emergency border-emergency/30"
                        : "bg-card text-foreground border-border hover:border-emergency/30"
                    )}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Current Body Temperature (°C) — if known</label>
              <Input
                type="number"
                step="0.1"
                value={emergencyTemperature}
                onChange={(e) => setEmergencyTemperature(e.target.value)}
                placeholder="e.g. 38.5"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Describe what happened (optional)</label>
              <Textarea
                value={emergencyDescription}
                onChange={(e) => setEmergencyDescription(e.target.value)}
                placeholder="Briefly describe the situation, if you can..."
                className="mt-1"
                rows={3}
              />
            </div>

            <Button className="w-full gradient-primary hover:opacity-90" onClick={() => setStep(3)}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-foreground">Booking Details</h2>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <Input value={`${user.firstName} ${user.lastName}`} disabled className="mt-1 bg-muted/50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Matriculation No.</label>
                    <Input value={user.id} disabled className="mt-1 bg-muted/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Service</label>
                  <Input value={selectedService} disabled className="mt-1 bg-muted/50" />
                </div>

                {isEmergency && (
                  <div className="bg-emergency/10 border border-emergency/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-emergency">🚨 Emergency — You will be seen as soon as possible</p>
                    {selectedEmergencyTypes.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Type: {selectedEmergencyTypes.join(", ")}</p>
                    )}
                    {emergencyTemperature && (
                      <p className="text-xs text-muted-foreground">Temperature: {emergencyTemperature}°C</p>
                    )}
                  </div>
                )}

                {renderServiceSpecificFields()}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone (optional)</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080..." className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email (optional)</label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.com" className="mt-1" />
                  </div>
                </div>
                <Button
                  className="w-full gradient-primary hover:opacity-90"
                  disabled={!canSubmitDetails()}
                  onClick={handleBook}
                >
                  {isEmergency ? "Submit Emergency Request" : "Confirm Booking"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && confirmedAppointment && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isEmergency ? "Emergency Request Submitted!" : "Appointment Confirmed!"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isEmergency
                  ? "Please proceed to the clinic immediately. Staff have been notified."
                  : `Appointment confirmed for ${confirmedAppointment.timeSlot}`}
              </p>
            </div>

            <Card className="border-0 shadow-card-md text-left">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Booking ID</span><span className="text-sm font-bold text-primary">{confirmedAppointment.id}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Name</span><span className="text-sm font-semibold text-foreground">{confirmedAppointment.studentName}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm text-foreground">{formatDate(confirmedAppointment.date)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Time</span><span className="text-sm font-semibold text-foreground">{confirmedAppointment.timeSlot}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Service</span><span className="text-sm text-foreground">{confirmedAppointment.service}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Attending Clinician</span><span className="text-sm font-semibold text-primary">{confirmedAppointment.assignedAdminName}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><span className="text-sm font-semibold text-success">Confirmed</span></div>
                {confirmedAppointment.isEmergency && (
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Priority</span><span className="text-sm font-semibold text-emergency">🚨 Emergency</span></div>
                )}
                {confirmedAppointment.complaint && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Details:</span>
                    <p className="text-sm text-foreground mt-1">{confirmedAppointment.complaint}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground">
                {isEmergency ? "🚨 Please proceed to the clinic immediately" : "📋 Please arrive 30 minutes early"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Bring your student ID card</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1" variant="outline" onClick={() => handleDownloadTicket(confirmedAppointment)}>
                <Download className="w-4 h-4 mr-2" /> Download Ticket
              </Button>
              <Button className="flex-1 gradient-primary hover:opacity-90" onClick={() => { resetBooking(); setView("home"); }}>
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
