"use client";

import { AtSign } from "lucide-react";

export function ProfileHeader({
  name,
  username,
  bio,
}: {
  name: string;
  username: string;
  bio: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold text-lg">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
            <AtSign className="w-4 h-4 text-pink-500" />
          </div>
          <p className="text-sm text-slate-400">@{username}</p>
          <p className="text-sm text-slate-500 mt-0.5">{bio}</p>
        </div>
      </div>
    </div>
  );
}
