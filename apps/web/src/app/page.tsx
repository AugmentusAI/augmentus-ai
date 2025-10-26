"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="text-center mt-20">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">Welcome to Augmentus.ai</h1>
      <p className="text-lg text-gray-600 mb-8">
        The next-generation platform for building intelligent agents.
      </p>
      <Link
        href="/login"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Get Started
      </Link>
    </div>
  );
}