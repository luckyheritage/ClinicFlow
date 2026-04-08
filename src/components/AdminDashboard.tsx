import React, { useState, useMemo } from "react";
import { AuthUser } from "@/lib/auth";
import {
  getStoredAppointments, saveAppointments, generateTimeSlots, formatDate,
  addNotification, adminRoleLabels, Appointment, isAppointmentElapsed,
} from "@/lib/data";
import Header from "./Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle, Calendar, Clock, Users, ArrowUpDown, ChevronLeft, ChevronRight,
  Search, CheckCircle2, X, FileText,
} from "lucide-react";

const AdminDashboard: React.FC<{ user: AuthUser; onLogout: () => void }> = ({ user, onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Appointment[] | null>(null);
  const [expandedApptId, setExpandedApptId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>(() => getStoredAppointments());
  const timeSlots = generateTimeSlots();

  const isReceptionist = user.adminRole === "receptionist";
  const activeAppointments = useMemo(
    () => appointments.filter((a) => a.status === "confirmed" && !isAppointmentElapsed(a)),
    [appointments]
  );

  const runSearch = (source: Appointment[], query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return source.filter(
      (a) =>
        a.studentName.toLowerCase().includes(normalizedQuery) ||
        a.studentId.toLowerCase().includes(normalizedQuery) ||
        a.id.toLowerCase().includes(normalizedQuery)
    );
  };

  const persistAppointments = (updated: Appointment[]) => {
    saveAppointments(updated);
    setAppointments(updated);

    if (searchResults !== null) {
      setSearchResults(runSearch(updated.filter((a) => a.status === "confirmed" && !isAppointmentElapsed(a)), searchQuery));
    }
  };

  const dayAppts = useMemo(() => {
    const filtered = activeAppointments.filter((a) => a.date === selectedDate);
    if (isReceptionist) return filtered;
    return filtered.filter((a) => a.assignedAdminId === user.id);
  }, [activeAppointments, selectedDate, user.id, isReceptionist]);

  const emergencies = dayAppts.filter((a) => a.isEmergency);
  const totalToday = dayAppts.length;
  const avgWait = totalToday * 5;

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(format(d, "yyyy-MM-dd"));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearchResults(runSearch(activeAppointments, searchQuery));
  };

  const moveToEarliest = (apptId: string) => {
    const appt = activeAppointments.find((a) => a.id === apptId && a.isEmergency);
    if (!appt) return;

    const currentIndex = timeSlots.indexOf(appt.timeSlot);
    const sameDayAppointments = activeAppointments
      .filter((a) => a.date === appt.date)
      .sort((a, b) => timeSlots.indexOf(a.timeSlot) - timeSlots.indexOf(b.timeSlot));

    const earlierAppointments = sameDayAppointments.filter(
      (candidate) => candidate.id !== appt.id && timeSlots.indexOf(candidate.timeSlot) < currentIndex
    );

    if (earlierAppointments.length === 0) {
      addNotification(appt.studentId, `Your emergency appointment is already at the top of the queue for ${appt.timeSlot} on ${formatDate(appt.date)}.`, "rescheduled");
      return;
    }

    const targetIndex = Math.min(...earlierAppointments.map((candidate) => timeSlots.indexOf(candidate.timeSlot)));
    const slotUpdates = new Map<string, string>();
    let nextSlot = appt.timeSlot;

    for (let index = currentIndex - 1; index >= targetIndex; index -= 1) {
      const slot = timeSlots[index];
      const occupyingAppointment = sameDayAppointments.find(
        (candidate) => candidate.id !== appt.id && candidate.timeSlot === slot
      );

      if (occupyingAppointment) {
        slotUpdates.set(occupyingAppointment.id, nextSlot);
      }

      nextSlot = slot;
    }

    const prioritizedSlot = timeSlots[targetIndex];
    slotUpdates.set(appt.id, prioritizedSlot);

    const updatedAppointments = appointments.map((appointment) => {
      const nextTimeSlot = slotUpdates.get(appointment.id);
      return nextTimeSlot ? { ...appointment, timeSlot: nextTimeSlot } : appointment;
    });

    persistAppointments(updatedAppointments);

    earlierAppointments.forEach((shiftedAppointment) => {
      const rescheduledSlot = slotUpdates.get(shiftedAppointment.id);
      if (!rescheduledSlot || rescheduledSlot === shiftedAppointment.timeSlot) return;

      addNotification(
        shiftedAppointment.studentId,
        `Your appointment on ${formatDate(shiftedAppointment.date)} has been rescheduled to ${rescheduledSlot} because an emergency patient was prioritized ahead of you.`,
        "rescheduled"
      );
    });

    addNotification(
      appt.studentId,
      `Your emergency appointment has been prioritized. New time: ${prioritizedSlot} on ${formatDate(appt.date)}.`,
      "rescheduled"
    );
  };

  const roleLabel = user.adminRole ? adminRoleLabels[user.adminRole] : "Admin";

  const renderPatientDetail = (a: Appointment) => (
    <div className="mt-3 pt-3 border-t border-border space-y-2 animate-fade-in">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Booking ID:</span> <strong className="text-foreground">{a.id}</strong></div>
        <div><span className="text-muted-foreground">Matriculation No:</span> <strong className="text-foreground">{a.studentId}</strong></div>
        <div><span className="text-muted-foreground">Service:</span> <strong className="text-foreground">{a.service}</strong></div>
        <div><span className="text-muted-foreground">Date:</span> <strong className="text-foreground">{formatDate(a.date)}</strong></div>
        <div><span className="text-muted-foreground">Time:</span> <strong className="text-foreground">{a.timeSlot}</strong></div>
        <div><span className="text-muted-foreground">Clinician:</span> <strong className="text-primary">{a.assignedAdminName}</strong></div>
        {a.phone && <div><span className="text-muted-foreground">Phone:</span> <strong className="text-foreground">{a.phone}</strong></div>}
        {a.email && <div><span className="text-muted-foreground">Email:</span> <strong className="text-foreground">{a.email}</strong></div>}
      </div>
      {a.complaint && (
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground mb-1 font-semibold">Visit Details / Complaint:</p>
          <p className="text-sm text-foreground">{a.complaint}</p>
        </div>
      )}
      {a.isEmergency && (
        <div className="bg-emergency/10 border border-emergency/20 rounded-lg p-2">
          <p className="text-xs font-semibold text-emergency">🚨 Emergency Case</p>
          <p className="text-xs text-muted-foreground mt-1">{a.complaint}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} />
      <div className="container mx-auto px-4 py-6 max-w-4xl animate-fade-in">
        <div className="gradient-primary rounded-2xl p-6 mb-6 text-primary-foreground shadow-card-lg">
          <h2 className="text-xl sm:text-2xl font-bold mb-1">Admin Dashboard</h2>
          <p className="text-sm opacity-80">Welcome, {user.firstName} • {roleLabel}</p>
        </div>

        {/* Receptionist Search */}
        {isReceptionist && (
          <Card className="border-0 shadow-card mb-6">
            <CardContent className="p-4">
              <label className="text-sm font-semibold text-foreground mb-2 block">
                <Search className="w-4 h-4 inline mr-1" /> Search Patient
              </label>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name, matriculation number, or booking ID..."
                  className="flex-1"
                />
                <Button onClick={handleSearch} className="gradient-primary">Search</Button>
              </div>
              {searchResults !== null && (
                <div className="mt-4 space-y-2">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matching appointments found.</p>
                  ) : (
                    searchResults.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl bg-success/5 border border-success/20 cursor-pointer hover:bg-success/10 transition-colors"
                        onClick={() => setExpandedApptId(expandedApptId === a.id ? null : a.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="font-semibold text-foreground text-sm">{a.studentName}</span>
                          <span className="text-xs text-muted-foreground">({a.studentId})</span>
                          {a.isEmergency && <span className="text-xs text-emergency font-semibold">🚨</span>}
                          <FileText className="w-3 h-3 text-muted-foreground ml-auto" />
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <span>Booking ID: <strong className="text-foreground">{a.id}</strong></span>
                          <span>Time: <strong className="text-foreground">{a.timeSlot}</strong></span>
                          <span>Service: <strong className="text-foreground">{a.service}</strong></span>
                          <span>Date: <strong className="text-foreground">{formatDate(a.date)}</strong></span>
                          <span className="col-span-2">Attending: <strong className="text-primary">{a.assignedAdminName}</strong></span>
                        </div>
                        {expandedApptId === a.id && renderPatientDetail(a)}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalToday}</p>
              <p className="text-xs text-muted-foreground">{isReceptionist ? "All Patients" : "My Patients"}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-accent mb-1" />
              <p className="text-2xl font-bold text-foreground">~{avgWait}m</p>
              <p className="text-xs text-muted-foreground">Avg Wait</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto text-emergency mb-1" />
              <p className="text-2xl font-bold text-foreground">{emergencies.length}</p>
              <p className="text-xs text-muted-foreground">Emergencies</p>
            </CardContent>
          </Card>
        </div>

        {/* Date selector */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="font-bold text-foreground">{formatDate(selectedDate)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => shiftDate(1)}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Appointments */}
        <div className="space-y-2">
          {timeSlots.map((slot) => {
            const slotAppts = dayAppts.filter((a) => a.timeSlot === slot);
            if (slotAppts.length === 0) {
              return (
                <div key={slot} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <span className="text-sm font-mono font-semibold w-20 shrink-0 text-muted-foreground">{slot}</span>
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
              );
            }
            return slotAppts.map((appt) => (
              <div
                key={appt.id}
                className={cn(
                  "p-3 rounded-xl transition-all cursor-pointer",
                  appt.isEmergency
                    ? "bg-emergency/10 border border-emergency/20"
                    : "bg-card shadow-card border border-border/50",
                  expandedApptId === appt.id && "shadow-card-md"
                )}
                onClick={() => setExpandedApptId(expandedApptId === appt.id ? null : appt.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-semibold w-20 shrink-0 text-foreground">{slot}</span>
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {appt.studentName}
                        {appt.isEmergency && <span className="ml-2 text-emergency">🚨</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.service} • {appt.studentId}
                        {isReceptionist && ` • ${appt.assignedAdminName}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {appt.isEmergency && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); moveToEarliest(appt.id); }}>
                          <ArrowUpDown className="w-3 h-3 mr-1" /> Prioritize
                        </Button>
                      )}
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                {expandedApptId === appt.id && renderPatientDetail(appt)}
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
