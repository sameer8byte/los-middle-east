import { logout } from "../shared/services/api/auth.api";

export function handelLogout() {
  // Clear specific authentication-related items
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("partnerUser");
  // Clear all sessionStorage (you can be more specific if needed)
  sessionStorage.clear();
  // Clear localStorage (keeping this for any legacy data)
  localStorage.clear();
  
  //redirect to login page
  window.location.href = "/login";
  
  // Clear any other relevant state or perform additional cleanup if necessary
  // For example, you might want to reset Redux state or clear cookies
  return new Promise((resolve, reject) => {
    logout()
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}
