/**
 * Mendapatkan timestamp saat ini dalam format HH:mm:ss
 * @returns {string}
 */
export function getTimestamp() {
    return new Date().toLocaleTimeString('id-ID', { hour12: false });
}
