"use client";

import { usePathname } from "next/navigation";

export default function RouteBackground() {
  const pathname = usePathname();
  const isPortfolio = pathname?.startsWith("/portfolio");
  const isStudio = pathname?.startsWith("/studio");
  const bgImage = isPortfolio
    ? "url('/background-3.png')"
    : isStudio
      ? "url('/background-4.jpg')"
      : "url('/background.jpg')";

  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-gray-900"
      style={{ backgroundImage: bgImage }}
    />
  );
}
