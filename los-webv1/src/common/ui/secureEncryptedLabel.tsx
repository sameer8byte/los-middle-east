import { BiShield } from "react-icons/bi";

export function SecureEncryptedLabel() {
  return ( <div className="p-3 bg-white  rounded-brand">
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-sm">
        <BiShield className="h-4 w-4 text-primary" />
        <span className="text-label">Secure, encrypted connection</span>
      </div>
    </div>
  </div>
  )
}