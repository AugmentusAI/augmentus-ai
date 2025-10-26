"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // Check login state when component mounts and whenever localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
    };

    // Initial check
    checkAuth();

    // Listen for changes (e.g. login/logout in another tab)
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  const handleLogout = () => {
  localStorage.removeItem("token");
  window.dispatchEvent(new Event("storage")); // refresh navbar state
  router.push("/"); // go back to public home
};

  return (
    <nav className="flex items-center justify-between bg-blue-600 p-4 text-white shadow-md">
      <Link href="/" className="font-bold text-lg">
        Augmentus.ai
      </Link>
      <div className="space-x-4">
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        ) : (
          <Link
            href="/login"
            className="bg-green-500 px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}