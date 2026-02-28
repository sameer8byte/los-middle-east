import { useCallback, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useAppSelector } from "../redux/store";
import { registerUserDevice } from "../services/api/user-devices.api";
import { platformType } from "../types/user-devices";

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

// OS detection
function getOS() {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua)) return "Windows 10";
  if (/Windows NT 6.3/.test(ua)) return "Windows 8.1";
  if (/Windows NT 6.2/.test(ua)) return "Windows 8";
  if (/Windows NT 6.1/.test(ua)) return "Windows 7";
  if (/Macintosh|Mac OS X/.test(ua)) return "MacOS";
  if (/Linux/.test(ua)) return "Linux";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "Unknown OS";
}

// IP detection
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
  const brand = useAppSelector((state) => state.index);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const postRegisterUserDevice = useCallback(async () => {
    if (!brand.id) return null;

    try {
      let fpId = await getDeviceIdFromDB();

      const fp = await FingerprintJS.load();
      const result = await fp.get();
      fpId = result.visitorId;

      const deviceType = /Mobi|Android/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop";
      const ip = await getIPAddress();

      const [, registeredDevice] = await Promise.all([
        saveDeviceIdToDB(fpId),
        registerUserDevice(brand.id, {
          fpId,
          deviceType,
          os: getOS(),
          appVersion: "1",
          fcmToken: "",
          ipAddress: ip,
          userAgent: navigator.userAgent,
          brandId: brand.id,
          lastActiveAt: new Date(),
          platformType: platformType.WEB,
        }),
      ]);

      setDeviceId(registeredDevice.id);
      return registeredDevice.id;
    } catch (error) {
      console.error("Error fetching device ID:", error);
      return null;
    }
  }, [brand.id]);
  return { deviceId, postRegisterUserDevice };
}
