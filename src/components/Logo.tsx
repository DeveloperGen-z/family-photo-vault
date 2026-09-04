import { useTheme } from "@/hooks/use-theme";

interface LogoProps {
  size?: number;
  variant?: "light" | "dark";
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 32, variant, showText = false, className = "" }: LogoProps) {
  const { theme } = useTheme();
  // Auto: dark theme → light icon, light theme → dark icon. Explicit variant wins.
  const v = variant ?? (theme === "dark" ? "light" : "dark");
  const iconColor = v === "light" ? "#FFFFFF" : "#1D1D1F";
  const bgColor = v === "light" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const textColor = v === "light" ? "rgba(255,255,255,0.92)" : "#1D1D1F";
  const subColor = v === "light" ? "rgba(255,255,255,0.45)" : "#86868B";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col" style={{ lineHeight: 1 }}>
          <span style={{ fontSize: size * 0.32, fontWeight: 700, color: textColor, fontFamily: "'Playfair Display', serif" }}>
            बड़ोलिया
          </span>
          <span style={{ fontSize: size * 0.22, fontWeight: 700, color: subColor, fontFamily: "'Playfair Display', serif" }}>
            परिवार
          </span>
        </div>
      )}
    </div>
  );
}