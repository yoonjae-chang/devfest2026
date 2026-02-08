import Link from "next/link";
import { AuthButton } from "@/components/auth-button";

export default function Header() {
  return (
    <header className="bg-transparent">
      <div className="max-w-6xl mx-auto pl-4 pr-6 py-4 flex items-center">
        <Link
          href="/"
          className="text-xl font-semibold text-white drop-shadow-md hover:text-white/90 transition-colors"
        >
          TuneTree
        </Link>
        <nav className="ml-auto flex items-center gap-6 text-white" aria-label="Main navigation">
          <Link
            href="/convert"
            className="text-sm text-white/90 hover:text-white drop-shadow-md transition-colors"
          >
            MP3 → MIDI
          </Link>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
