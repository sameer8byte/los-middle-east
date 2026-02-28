import { useAppSelector } from "../../redux/store";
import { selectUserStatusId } from "../../redux/slices/user";
import { UserStatusEnum } from "../../constant/enum";
import { JSX } from "react";

export function RejectedComponent(): JSX.Element | null {
  const userStatusId = useAppSelector((state) => selectUserStatusId(state));
  if (
    userStatusId !== UserStatusEnum.BLOCKED &&
    userStatusId !== UserStatusEnum.SUSPENDED
  )
    return null;

  const isBlocked =
    userStatusId === UserStatusEnum.BLOCKED ||
    userStatusId === UserStatusEnum.SUSPENDED;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 text-center border">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl">❌</span>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-gray-800">
          Application Rejected
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Status:{" "}
          <span className="font-medium text-red-600">
            {isBlocked ? "Blocked" : "Suspended"}
          </span>
        </p>

        <p className="mt-4 text-gray-600 text-sm leading-relaxed">
          Unfortunately, your account is currently restricted. This may be due
          to verification failure or policy reasons. Please contact support if
          you believe this is a mistake.
        </p>
      </div>
    </div>
  );
}
