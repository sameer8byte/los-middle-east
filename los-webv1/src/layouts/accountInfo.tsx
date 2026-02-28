import { CgProfile } from "react-icons/cg";

export const AccountInfo = () => {
 
    return (
        <div className="flex items-center gap-2 rounded-brand">
            {/* Profile Icon */}
            <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full">
                <CgProfile size={30} className="text-gray-600" />
            </div>

 
        </div>
    );
};
