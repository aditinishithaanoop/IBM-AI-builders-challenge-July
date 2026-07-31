"use client";

import { usePathname } from "next/navigation";

export default function DynamicDots() {
  const pathname = usePathname();

  // Map your routes to your desired Tailwind color utility classes
  const getDotColorClass = () => {
    switch (pathname) {
      case "/tasks":
        return "text-brand/70"; // Blue dots for tasks page
      case "/meeting":
        return "text-meeting"; // Purple dots for meetings page
      case "/proposal":
        return "text-proposal"; // Emerald dots for proposals page
      default:
        return "text-brand/70"; // Fallback color
    }
  };

  return (
    <div
      className={`fixed inset-0 -z-10 bg-dot-grid fade-edges-x print:hidden transition-colors duration-300 ${getDotColorClass()}`}
      aria-hidden="true"
    />
  );
}
