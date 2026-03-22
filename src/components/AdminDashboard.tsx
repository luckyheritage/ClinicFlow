import React, { useState, useMemo } from "react";
import { AuthUser } from "@/lib/auth";
import {
  getStoredAppointments, saveAppointments, generateTimeSlots, formatDate,
  addNotification, adminRoleLabels,
} from "@/lib/data";
import Header from "./Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle, Calendar, Clock, Users, ArrowUpDown, ChevronLeft, ChevronRight,
  Search, CheckCircle2,
} from "lucide-react";

const AdminDashboard: React.FC<{ user: AuthUser; onLogout: () => void }> = ({ user, onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ReturnType<typeof getStoredAppointments> | null>(null);
  const appointments = getStoredAppointments();
  const timeSlots = generateTimeSlots();

  const isReceptionist = user.adminRole === "receptionist";

  // Filter appointments: receptionist sees all, others see only their assigned patients
  const dayAppts = useMemo(() => {
    const filtered = appointments.filter((a) => a.date === selectedDate && a.status === "confirmed");
    if (isReceptionist) return filtered;
    return filtered.filter((a) => a.assignedAdminId === user.id);
  }, [appointments, selectedDate, user.id, isReceptionist]);

  const emergencies = dayAppts.filter((a) => a.isEmergency);
  const totalToday = dayAppts.length;
  const avgWait = totalToday * 5;

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(format(d, "yyyy-MM-dd"));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const results = appointments.filter(
      (a) =>
        a.status === "confirmed" &&
        (a.studentName.toLowerCase().includes(q) ||
          a.studentId.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q))
    );
    setSearchResults(results);
  };

  const moveToEarliest = (apptId: string) => {
    const appt = appointments.find((a) => a.id === apptId);
    if (!appt) return;

    const bookedSlots = dayAppts.filter((a) => a.assignedAdminId === appt.assignedAdminId).map((a) => a.timeSlot);
    const earliest = timeSlots.find((s) => !bookedSlots.includes(s) || s === appt.timeSlot);

    if (earliest && earliest !== appt.timeSlot) {
      const updated = appointments.map((a) => {
        if (a.id === apptId) return { ...a, timeSlot: earliest };
        return a;
      });
      saveAppointments(updated);
      addNotification(appt.studentId, `Your appointment has been adjusted due to an emergency. New time: ${earliest}`, "rescheduled");
      addNotification(user.id, `Moved ${appt.studentName} to ${earliest}`, "rescheduled");
      window.location.reload();
    }
  };

  const roleLabel = user.adminRole ? adminRoleLabels[user.adminRole] : "Admin";

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
                      <div key={a.id} className="p-3 rounded-xl bg-success/5 border border-success/20">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="font-semibold text-foreground text-sm">{a.studentName}</span>
                          <span className="text-xs text-muted-foreground">({a.studentId})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <span>Booking ID: <strong className="text-foreground">{a.id}</strong></span>
                          <span>Time: <strong className="text-foreground">{a.timeSlot}</strong></span>
                          <span>Service: <strong className="text-foreground">{a.service}</strong></span>
                          <span>Date: <strong className="text-foreground">{formatDate(a.date)}</strong></span>
                          <span className="col-span-2">Attending: <strong className="text-primary">{a.assignedAdminName}</strong></span>
                        </div>
                        {a.isEmergency && (
                          <span className="text-xs text-emergency font-semibold mt-1 inline-block">🚨 Emergency</span>
                        )}
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
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  appt.isEmergency
                    ? "bg-emergency/10 border border-emergency/20"
                    : "bg-card shadow-card border border-border/50"
                )}
              >
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
                  {appt.isEmergency && !isReceptionist && (
                    <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs" onClick={() => moveToEarliest(appt.id)}>
                      <ArrowUpDown className="w-3 h-3 mr-1" /> Prioritize
                    </Button>
                  )}
                </div>
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
