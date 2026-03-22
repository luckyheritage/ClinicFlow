import React, { useState, useMemo } from "react";
import { AuthUser } from "@/lib/auth";
import {
  Appointment, generateTimeSlots, generateBookingId, getStoredAppointments,
  saveAppointments, addNotification, services, isWeekday, formatDate,
} from "@/lib/data";
import StepIndicator from "./StepIndicator";
import Header from "./Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user, onLogout, preselectedDate, preselectedSlot,
}) => {
  const [view, setView] = useState<"home" | "book" | "queue" | "myAppointments" | "notifications">("home");
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    preselectedDate ? new Date(preselectedDate + "T00:00:00") : undefined
  );
  const [selectedSlot, setSelectedSlot] = useState(preselectedSlot || "");
  const [complaint, setComplaint] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const timeSlots = generateTimeSlots();
  const appointments = getStoredAppointments();
  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const bookedSlotsForDate = useMemo(
    () => appointments.filter((a) => a.date === dateStr && a.status === "confirmed").map((a) => a.timeSlot),
    [appointments, dateStr]
  );

  const recommendedSlot = useMemo(() => {
    return timeSlots.find((s) => !bookedSlotsForDate.includes(s)) || null;
  }, [timeSlots, bookedSlotsForDate]);

  const estimatedWait = useMemo(() => {
    const booked = bookedSlotsForDate.length;
    return booked * 5; // rough estimate
  }, [bookedSlotsForDate]);

  const myAppointments = appointments.filter((a) => a.studentId === user.id && a.status === "confirmed");

  const resetBooking = () => {
    setStep(0);
    setSelectedService("");
    setIsEmergency(false);
    setSelectedDate(undefined);
    setSelectedSlot("");
    setComplaint("");
    setPhone("");
    setEmail("");
    setConfirmedAppointment(null);
  };

  const handleBook = () => {
    if (bookedSlotsForDate.includes(selectedSlot)) return;

    const appt: Appointment = {
      id: generateBookingId(),
      studentId: user.id,
      studentName: `${user.firstName} ${user.lastName}`,
      date: dateStr,
      timeSlot: selectedSlot,
      service: selectedService,
      complaint,
      phone,
      email,
      isEmergency,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    const updated = [...appointments, appt];
    saveAppointments(updated);
    addNotification(user.id, `Appointment confirmed for ${selectedSlot} on ${formatDate(dateStr)}. Please arrive 30 minutes early.`, "confirmation");
    if (isEmergency) {
      addNotification("ADMIN01", `🚨 Emergency: ${user.firstName} ${user.lastName} booked ${selectedSlot} - ${selectedService}`, "emergency");
    }
    setConfirmedAppointment(appt);
    setStep(4);
  };

  const handleCancel = (apptId: string) => {
    const updated = appointments.map((a) => (a.id === apptId ? { ...a, status: "cancelled" as const } : a));
    saveAppointments(updated);
    addNotification(user.id, `Your appointment ${apptId} has been cancelled.`, "cancelled");
    setView("myAppointments");
  };

  const handleBookFromQueue = (date: string, slot: string) => {
    setSelectedDate(new Date(date + "T00:00:00"));
    setSelectedSlot(slot);
    setStep(0);
    setView("book");
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
                  <p className="text-xs text-muted-foreground">See today's schedule</p>
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
    const active = getStoredAppointments().filter((a) => a.studentId === user.id && a.status === "confirmed");
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
                        {a.isEmergency && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emergency mt-1">
                            <AlertTriangle className="w-3 h-3" /> Emergency
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          handleCancel(a.id);
                        }}>
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
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const todayAppts = getStoredAppointments().filter((a) => a.date === todayStr && a.status === "confirmed");
    const todayBooked = todayAppts.map((a) => a.timeSlot);

    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={onLogout} />
        <div className="container mx-auto px-4 py-6 max-w-2xl animate-fade-in">
          <Button variant="ghost" onClick={() => setView("home")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Today's Queue</h2>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary">Patients waiting: {todayAppts.length}</p>
              <p className="text-xs text-muted-foreground">Avg wait: ~{todayAppts.length * 5} min</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {timeSlots.map((slot) => {
              const appt = todayAppts.find((a) => a.timeSlot === slot);
              const booked = !!appt;
              return (
                <button
                  key={slot}
                  onClick={() => !booked && handleBookFromQueue(todayStr, slot)}
                  disabled={booked}
                  className={cn(
                    "p-3 rounded-xl text-left transition-all text-sm",
                    booked
                      ? "bg-destructive/10 border border-destructive/20 cursor-not-allowed"
                      : "bg-success/10 border border-success/20 hover:bg-success/20 cursor-pointer hover:shadow-card-md"
                  )}
                >
                  <p className={cn("font-semibold", booked ? "text-destructive" : "text-success")}>{slot}</p>
                  <p className="text-xs mt-0.5 truncate">
                    {booked ? appt!.studentName : "Available"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Booking flow
  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} />
      <div className="container mx-auto px-4 py-6 max-w-2xl animate-fade-in">
        <Button variant="ghost" onClick={() => (step > 0 && step < 4 ? setStep(step - 1) : (resetBooking(), setView("home")))} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> {step > 0 && step < 4 ? "Back" : "Home"}
        </Button>

        <StepIndicator steps={STEPS} currentStep={step} />

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
                className={cn("cursor-pointer border-0 shadow-card hover:shadow-card-md", !isEmergency && step === 1 && "")}
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

        {/* Step 2: Time */}
        {step === 2 && (
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
                    <label className="text-xs font-medium text-muted-foreground">Matric No.</label>
                    <Input value={user.id} disabled className="mt-1 bg-muted/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Service</label>
                  <Input value={selectedService} disabled className="mt-1 bg-muted/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Symptoms / Complaint *</label>
                  <Textarea
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    placeholder="Describe your symptoms..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
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
                  disabled={!complaint.trim()}
                  onClick={handleBook}
                >
                  Confirm Booking
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
              <h2 className="text-xl font-bold text-foreground">Appointment Confirmed!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Appointment confirmed for {confirmedAppointment.timeSlot}
              </p>
            </div>

            <Card className="border-0 shadow-card-md text-left">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Booking ID</span><span className="text-sm font-bold text-primary">{confirmedAppointment.id}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Name</span><span className="text-sm font-semibold text-foreground">{confirmedAppointment.studentName}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm text-foreground">{formatDate(confirmedAppointment.date)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Time</span><span className="text-sm font-semibold text-foreground">{confirmedAppointment.timeSlot}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Service</span><span className="text-sm text-foreground">{confirmedAppointment.service}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><span className="text-sm font-semibold text-success">Confirmed</span></div>
                {confirmedAppointment.isEmergency && (
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Priority</span><span className="text-sm font-semibold text-emergency">🚨 Emergency</span></div>
                )}
              </CardContent>
            </Card>

            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground">📋 Please arrive 30 minutes early</p>
              <p className="text-xs text-muted-foreground mt-1">Bring your student ID card</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1 gradient-primary hover:opacity-90" onClick={() => { resetBooking(); setView("home"); }}>
                Back to Home
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setView("myAppointments")}>
                View My Appointments
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
