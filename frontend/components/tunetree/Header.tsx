import Link from "next/link";
import Image from "next/image";
import { AuthButton } from "@/components/auth-button";

export default function Header() {
  return (
    <header className="bg-transparent">
      <div className="w-full px-8 sm:px-12 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-semibold text-white drop-shadow-md hover:text-white/90 transition-colors"
        >
          <Image
            src="/icon.png"
            alt="TuneTree"
            width={32}
            height={32}
            className="shrink-0"
          />
          TuneTree
        </Link>
        <nav className="ml-auto flex items-center gap-6 text-white" aria-label="Main navigation">
          <Link
            href="/portfolio"
            className="text-sm text-white/90 hover:text-white drop-shadow-md transition-colors"
          >
            Portfolio
          </Link>
          <Link
            href="/studio"
            className="text-sm text-white/90 hover:text-white drop-shadow-md transition-colors"
          >
            Studio
          </Link>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
