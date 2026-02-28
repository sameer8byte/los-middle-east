import { logout } from "../services/api/auth.api";

export function handelLogout() {
  localStorage.clear();
  sessionStorage.clear();
  //redirect to login page
  window.location.href = "/phone-verification";
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
