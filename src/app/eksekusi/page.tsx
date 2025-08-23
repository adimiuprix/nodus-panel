"use client";

import { useState } from "react";

export default function ApacheGUI() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"running" | "stopped" | "loading">("stopped");

  const handleClick = async (action: string) => {
    if (action === "status") setStatus("loading");
    const res = await fetch("/api/apache", {
      method: "POST",
      body: JSON.stringify({ action }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (action === "status") {
      if (data.message.includes("💖")) setStatus("running");
      else setStatus("stopped");
    }

    setMessage(data.message);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 p-8">
      <h1 className="text-4xl font-bold mb-6 text-pink-600 drop-shadow-md">
        Apache Control GUI 💖
      </h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => handleClick("start")}
          className="px-6 py-2 bg-green-400 text-white rounded-xl cursor-pointer shadow hover:bg-green-500 transition"
        >
          Start Apache
        </button>
        <button
          onClick={() => handleClick("stop")}
          className="px-6 py-2 bg-red-400 text-white rounded-xl cursor-pointer shadow hover:bg-red-500 transition"
        >
          Stop Apache
        </button>
        <button
          onClick={() => handleClick("status")}
          className="px-6 py-2 bg-blue-400 text-white rounded-xl cursor-pointer shadow hover:bg-blue-500 transition flex items-center gap-2"
        >
          {status === "loading" ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : status === "running" ? (
            "💖 Running"
          ) : (
            "💔 Stopped"
          )}
        </button>
      </div>

      <p className="text-lg text-gray-700 font-medium">{message}</p>
    </div>
  );
}
