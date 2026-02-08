import Link from "next/link";
import { AuthButton } from "@/components/auth-button";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
        <Link
          href="/"
          className="text-xl font-semibold text-gray-900 hover:text-gray-600 transition-colors"
        >
          TuneTree
        </Link>
        <nav className="ml-auto flex items-center gap-6" aria-label="Main navigation">
          <Link
            href="/portfolio"
            className="text-sm text-gray-600 hover:text-gray-900"
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
