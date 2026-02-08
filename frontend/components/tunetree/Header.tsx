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
<<<<<<< HEAD
            href="/convert"
            className="text-sm text-white/90 hover:text-white drop-shadow-md transition-colors"
=======
            href="/portfolio"
            className="text-sm text-gray-600 hover:text-gray-900"
>>>>>>> f1d818c20c00243d89a6f416af7e44a918941fb7
          >
            Portfolio
          </Link>
          <Link
            href="/studio"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Studio
          </Link>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
