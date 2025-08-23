"use client"

export default function writing() {

  const handleSubmit = async () => {
    await fetch("/api/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="space-y-4">
          <button
            onClick={handleSubmit}
            className={`w-full font-medium py-2 px-4 rounded-lg transition bg-blue-600 hover:bg-blue-700 text-white`}
          >
            clik
          </button>
        </div>
      </div>
    </div>
  )
}
