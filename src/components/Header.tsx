import React from "react";
import { AuthUser } from "@/lib/auth";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { getStoredNotifications } from "@/lib/data";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  user: AuthUser | null;
  onLogout: () => void;
  onNotificationsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onNotificationsClick }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const notifications = user ? getStoredNotifications().filter((n) => n.userId === user.id && !n.read) : [];

  return (
    <header className="gradient-hero text-primary-foreground shadow-card-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">ClinicFlow</h1>
          <p className="text-[10px] sm:text-xs opacity-80 font-medium">Book smart. Skip the wait.</p>
        </div>
        {user && (
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {onNotificationsClick && (
              <button onClick={onNotificationsClick} className="relative p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emergency text-[10px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            )}
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm font-medium opacity-90">
                {user.firstName} ({user.id})
              </span>
              <button onClick={onLogout} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-full hover:bg-primary-foreground/10">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>
      {menuOpen && user && (
        <div className="sm:hidden px-4 pb-3 flex items-center justify-between border-t border-primary-foreground/20 pt-2 animate-fade-in">
          <span className="text-sm opacity-90">{user.firstName} ({user.id})</span>
          <button onClick={onLogout} className="text-sm flex items-center gap-1 hover:underline">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
