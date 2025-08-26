import React, { useState } from 'react'
import { X } from 'lucide-react'

const ModalCreateVHost = () => {
    const [domain, setDomain] = useState("")
    const [loading, setLoading] = useState(false)
    
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
    const isValidDomain = domainRegex.test(domain.trim())

    const handleCreate = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/v_host_create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domain }),
            })

            if (!res.ok) {
                const errText = await res.text()
                throw new Error(`Failed to create vhost: ${errText}`)
            }

            const data = await res.json()
            console.log("Vhost created:", data);
            (document.getElementById('create_v_host') as HTMLDialogElement).close()
        } catch (error) {
            console.error(error)
            alert((error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return(
        <>
            <dialog id="create_v_host" className="modal">
                <div className="modal-box">
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X/></button>
                    </form>
                    <div className="mt-4">
                        <fieldset className="fieldset mt-4">
                            <legend className="fieldset-legend">Input domain name</legend>
                            <input
                                type="text"
                                placeholder="Domainname"
                                className="input input-info w-full"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                            />
                        </fieldset>
                    </div>
                    <div className="mt-6 flex justify-center gap-x-3">
                        <button
                            onClick={handleCreate}
                            disabled={!domain.trim() || !isValidDomain || loading}
                            className="btn btn-outline btn-primary"
                        >
                            {loading ? "Creating..." : "Create"}
                        </button>
                        <form method="dialog">
                            <button className="btn btn-outline btn-error">Cancel</button>
                        </form>
                    </div>
                </div>
            </dialog>
        </>
    )
}

export default ModalCreateVHost