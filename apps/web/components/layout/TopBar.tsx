"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export function TopBar() {
  const { data: session } = useSession();

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
      <div className="text-sm text-gray-500">
        {(session as any)?.businessName ?? "Your Business"}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <User size={15} className="text-gray-400" />
          <span>{session?.user?.name ?? session?.user?.email}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </header>
  );
}
