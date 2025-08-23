"use client"

import { useEffect, useState } from "react"

export default function BacaFilePage() {
  const [isi, setIsi] = useState<string>("")

  useEffect(() => {
    fetch("/api/baca")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsi(data.content)
        } else {
          setIsi("Gagal baca file: " + data.error)
        }
      })
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Isi File 💌</h1>
      <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded">
        {isi}
      </pre>
    </div>
  )
}
