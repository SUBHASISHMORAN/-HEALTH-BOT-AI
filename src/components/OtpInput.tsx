import {
  useRef,
  useState,
  useEffect,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  className?: string;
}

export const OTPInput = ({
  length = 6,
  onComplete,
  className,
}: OTPInputProps) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Check if OTP is complete
    if (otp.every((digit) => digit !== "") && onComplete) {
      onComplete(otp.join(""));
    }
  }, [otp, onComplete]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take last character
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];

      if (otp[index]) {
        // Clear current box
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous box and clear it
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);

    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < length) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);

    // Focus last filled input or last input
    const lastIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[lastIndex]?.focus();
  };

  return (
    <div className={cn("flex gap-3 justify-center", className)}>
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            "w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-semibold rounded-xl",
            "bg-[hsl(var(--otp-box))] border-2 border-[hsl(var(--otp-box-border))]",
            "text-foreground transition-all duration-300",
            "focus:outline-none focus:border-[hsl(var(--otp-box-focus))] focus:scale-105",
            "hover:border-[hsl(var(--otp-box-focus))]",
            digit && "border-[hsl(var(--otp-box-focus))]"
          )}
        />
      ))}
    </div>
  );
};
