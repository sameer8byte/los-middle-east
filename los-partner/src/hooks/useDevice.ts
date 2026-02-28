import FingerprintJS from "@fingerprintjs/fingerprintjs";
 
import { useCallback } from "react";
import { registerUserDevice } from "../shared/services/api/user-devices.api";
import { PlatformType } from "../constant/enum";
 
// IndexedDB helper functions
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("DeviceDB", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("DeviceStore");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getDeviceIdFromDB(): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("DeviceStore", "readonly");
    const store = tx.objectStore("DeviceStore");
    const request = store.get("device_id");

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function saveDeviceIdToDB(deviceId: string) {
  const db = await openDB();
  const tx = db.transaction("DeviceStore", "readwrite");
  tx.objectStore("DeviceStore").put(deviceId, "device_id");
}

function getOS() {
  const userAgent = navigator.userAgent;
  if (/Windows NT 10/.test(userAgent)) return "Windows 10";
  if (/Windows NT 6.3/.test(userAgent)) return "Windows 8.1";
  if (/Windows NT 6.2/.test(userAgent)) return "Windows 8";
  if (/Windows NT 6.1/.test(userAgent)) return "Windows 7";
  if (/Macintosh|Mac OS X/.test(userAgent)) return "MacOS";
  if (/Linux/.test(userAgent)) return "Linux";
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  return "Unknown OS";
}

// function getBrowser() {
//     const userAgent = navigator.userAgent;
//     if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) return "Chrome";
//     if (/Edg/.test(userAgent)) return "Edge";
//     if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) return "Safari";
//     if (/Firefox/.test(userAgent)) return "Firefox";
//     if (/Opera|OPR/.test(userAgent)) return "Opera";
//     if (/MSIE|Trident/.test(userAgent)) return "Internet Explorer";
//     return "Unknown Browser";
// }

async function getIPAddress() {
  try {
    const response = await fetch("https://api64.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("Error fetching IP:", error);
    return "Unknown IP";
  }
}

// Hook to get or create a persistent device ID
export function useDevice() {
  const postRegisterUserDevice = useCallback(async () => {
    try {
      let fpId = await getDeviceIdFromDB();
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      fpId = result.visitorId; // Unique device fingerprint
      const deviceType = /Mobi|Android/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop";
      const ip = await getIPAddress();
      const [, registeredDevice] = await Promise.all([
        saveDeviceIdToDB(fpId),
        registerUserDevice(null, {
          fpId: fpId,
          deviceType: deviceType,
          os: getOS(),
          appVersion: "1",
          fcmToken: "",
          ipAddress: ip,
          userAgent: navigator.userAgent,
          brandId: null,
          lastActiveAt: new Date(),
          platformType: PlatformType.PARTNER,
        }),
      ]);
      return registeredDevice.id;
    } catch (error) {
      console.error("Error fetching device ID:", error);
    }
  }, []);

  return {
    postRegisterUserDevice,
  };
}
