import React, { useState, useMemo } from "react";
import { AuthUser } from "@/lib/auth";
import {
  getStoredAppointments, saveAppointments, generateTimeSlots, formatDate,
  addNotification,
} from "@/lib/data";
import Header from "./Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle, Calendar, Clock, Users, ArrowUpDown, ChevronLeft, ChevronRight,
} from "lucide-react";

const AdminDashboard: React.FC<{ user: AuthUser; onLogout: () => void }> = ({ user, onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const appointments = getStoredAppointments();
  const timeSlots = generateTimeSlots();

  const dayAppts = useMemo(
    () => appointments.filter((a) => a.date === selectedDate && a.status === "confirmed"),
    [appointments, selectedDate]
  );

  const emergencies = dayAppts.filter((a) => a.isEmergency);
  const totalToday = dayAppts.length;
  const avgWait = totalToday * 5;

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(format(d, "yyyy-MM-dd"));
  };

  const moveToEarliest = (apptId: string) => {
    const appt = appointments.find((a) => a.id === apptId);
    if (!appt) return;

    const bookedSlots = dayAppts.map((a) => a.timeSlot);
    const earliest = timeSlots.find((s) => !bookedSlots.includes(s) || s === appt.timeSlot);

    if (earliest && earliest !== appt.timeSlot) {
      // Find the appointment currently in earliest slot and swap
      const updated = appointments.map((a) => {
        if (a.id === apptId) return { ...a, timeSlot: earliest };
        return a;
      });
      saveAppointments(updated);
      addNotification(appt.studentId, `Your appointment has been adjusted due to an emergency. New time: ${earliest}`, "rescheduled");
      addNotification(user.id, `Moved ${appt.studentName} to ${earliest}`, "rescheduled");
      // Force re-render
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} />
      <div className="container mx-auto px-4 py-6 max-w-4xl animate-fade-in">
        <div className="gradient-primary rounded-2xl p-6 mb-6 text-primary-foreground shadow-card-lg">
          <h2 className="text-xl sm:text-2xl font-bold mb-1">Admin Dashboard</h2>
          <p className="text-sm opacity-80">Welcome, {user.firstName}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalToday}</p>
              <p className="text-xs text-muted-foreground">Patients Today</p>
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
            const appt = dayAppts.find((a) => a.timeSlot === slot);
            return (
              <div
                key={slot}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  appt
                    ? appt.isEmergency
                      ? "bg-emergency/10 border border-emergency/20"
                      : "bg-card shadow-card border border-border/50"
                    : "bg-muted/50"
                )}
              >
                <span className={cn("text-sm font-mono font-semibold w-20 shrink-0", appt ? "text-foreground" : "text-muted-foreground")}>{slot}</span>
                {appt ? (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {appt.studentName}
                        {appt.isEmergency && <span className="ml-2 text-emergency">🚨</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{appt.service} • {appt.studentId}</p>
                    </div>
                    {appt.isEmergency && (
                      <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs" onClick={() => moveToEarliest(appt.id)}>
                        <ArrowUpDown className="w-3 h-3 mr-1" /> Prioritize
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Available</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
