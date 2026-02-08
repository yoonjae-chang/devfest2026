"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAVY = "text-[#1e3a5f]";
const NAVY_HOVER = "hover:text-[#1e3a5f]/90";
const WHITE = "text-white";
const WHITE_HOVER = "hover:text-white/90";

type HeaderProps = {
  children?: React.ReactNode;
};

export default function Header({ children }: HeaderProps) {
  const pathname = usePathname();
  const isResultsPage = pathname?.startsWith("/results");
  const isPortfolioPage = pathname?.startsWith("/portfolio");
  const useNavy = isResultsPage;

  const linkBase = "text-xl font-semibold drop-shadow-md transition-colors";
  const linkClass = useNavy
    ? `${linkBase} ${NAVY} ${NAVY_HOVER}`
    : `${linkBase} ${WHITE} ${WHITE_HOVER}`;
  const navClass = useNavy ? `ml-auto flex items-center gap-6 ${NAVY}` : "ml-auto flex items-center gap-6 text-white";
  const navLinkClass = useNavy
    ? "text-sm text-[#1e3a5f]/90 hover:text-[#1e3a5f] drop-shadow-md transition-colors"
    : "text-sm text-white/90 hover:text-white drop-shadow-md transition-colors";

  const headerClass = isPortfolioPage
    ? "glass-navbar"
    : "bg-transparent";

  return (
    <header className={headerClass}>
      <div className="w-full px-8 sm:px-12 py-4 flex items-center justify-between">
        <Link href="/" className={`flex items-center gap-2 ${linkClass}`}>
          <Image
            src="/icon.png"
            alt="TuneTree"
            width={32}
            height={32}
            className="shrink-0"
          />
          TuneTree
        </Link>
        <nav className={navClass} aria-label="Main navigation">
          <Link href="/portfolio" className={navLinkClass}>
            Portfolio
          </Link>
          <Link href="/studio" className={navLinkClass}>
            Studio
          </Link>
          {children}
        </nav>
      </div>
    </header>
  );
}
