import React, { useState } from "react";
import { authenticate, storeUser, AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, UserCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [loginId, setLoginId] = useState("");
  const [error, setError] = useState("");
  const [loginType, setLoginType] = useState<"student" | "admin">("student");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const user = authenticate(loginId);
    if (user) {
      storeUser(user);
      onLogin(user);
    } else {
      setError("Invalid Login Details");
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8 text-primary-foreground">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">ClinicFlow</h1>
            <p className="text-sm sm:text-base opacity-80 font-medium">Book smart. Skip the wait.</p>
          </div>

          <Card className="shadow-card-lg border-0">
            <CardContent className="p-6 sm:p-8">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => { setLoginType("student"); setError(""); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    loginType === "student" ? "gradient-primary text-primary-foreground shadow-card-md" : "bg-muted text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <UserCircle className="w-4 h-4" /> Student
                </button>
                <button
                  onClick={() => { setLoginType("admin"); setError(""); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    loginType === "admin" ? "gradient-primary text-primary-foreground shadow-card-md" : "bg-muted text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <ShieldCheck className="w-4 h-4" /> Admin
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    {loginType === "student" ? "Matriculation Number" : "Admin ID"}
                  </label>
                  <Input
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder={loginType === "student" ? "Enter your matriculation number" : "Enter your admin ID"}
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-lg animate-fade-in">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity" size="lg">
                  <LogIn className="w-5 h-5 mr-2" /> Sign In
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-4">
                {loginType === "student" ? "Enter your matriculation number to sign in" : "Enter your admin ID to sign in"}
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
