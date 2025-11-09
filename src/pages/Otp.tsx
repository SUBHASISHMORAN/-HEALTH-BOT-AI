import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Smartphone } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { OTPInput } from "@/components/OtpInput";

const OTPVerification = () => {
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from previous page
  const { phone, firstName, lastName } = location.state || {};

  // Redirect back if no phone number provided
  useEffect(() => {
    if (!phone) {
      toast({
        title: "No Phone Number",
        description: "Please complete the signup form first",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [phone, navigate, toast]);

  // Mask phone number for display (show last 4 digits)
  const maskedPhone = phone ? `****${phone.slice(-4)}` : "";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOTPComplete = async (otp: string) => {
    setIsVerifying(true);

    // Simulate verification
    setTimeout(() => {
      toast({
        title: "Success!",
        description: `Welcome ${firstName}! Your account is verified.`,
      });
      setIsVerifying(false);
      // Navigate to main page or dashboard
      navigate("/");
    }, 1500);
  };

  const handleResendOTP = () => {
    if (!canResend) return;

    setCountdown(30);
    setCanResend(false);
    toast({
      title: "OTP Resent",
      description: "A new verification code has been sent to your phone",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-8 -ml-4 text-foreground hover:bg-secondary"
          onClick={() => navigate("/auth")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-lg p-8 md:p-10 border border-border">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Verify Your Phone
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-foreground font-semibold text-lg">
              {maskedPhone}
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm mt-2">
              Please enter it below to continue.
            </p>
          </div>

          {/* OTP Input */}
          <div className="mb-8">
            <OTPInput
              length={6}
              onComplete={handleOTPComplete}
              className="mb-2"
            />
            {isVerifying && (
              <p className="text-center text-sm text-muted-foreground mt-4 animate-pulse">
                Verifying...
              </p>
            )}
          </div>

          {/* Resend Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {!canResend ? (
                <>
                  <span>Resend code in</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {countdown}s
                  </span>
                </>
              ) : (
                <span>Didn't receive the code?</span>
              )}
            </div>

            <Button
              variant={canResend ? "default" : "ghost"}
              onClick={handleResendOTP}
              disabled={!canResend}
              className={cn(
                "w-full transition-all duration-300",
                !canResend && "opacity-50 cursor-not-allowed"
              )}
            >
              Resend OTP
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Having trouble? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

// Import cn helper
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(" ");
};

export default OTPVerification;
