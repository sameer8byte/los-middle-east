// ? Localhost mode enable
const isEnableLocalhost = import.meta.env.VITE_APP_MODE === "development";
const localhostUri = "http://localhost:4002";
const Configuration = {
  baseUrl: isEnableLocalhost ? localhostUri : import.meta.env.VITE_NODE_URL,
};

export default Configuration;
