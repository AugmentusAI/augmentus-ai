"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex justify-between items-center p-4 bg-white shadow-sm">
      <Link href="/" className="text-2xl font-bold text-indigo-600">
        Augmentus.ai
      </Link>
      <div className="space-x-4">
        {user ? (
          <>
            <span className="text-gray-600">{user}</span>
            <button
              onClick={logout}
              className="text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/" className="hover:text-indigo-600">
              Home
            </Link>
            <Link href="/login" className="hover:text-indigo-600">
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}