"use client";

export default function Mekdir() {
  const mekdir = async () => {
    await fetch("/api/mkdir", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    alert("Folder berhasil dibuat!");
  };

  return (
    <div className="items-center justify-items-center min-h-screen p-8 pb-20 gap-16">
      <button 
        onClick={mekdir}  
        className="bg-amber-700 cursor-pointer m-3 p-2 text-white rounded"
      >
        click
      </button>
    </div>
  );
}
