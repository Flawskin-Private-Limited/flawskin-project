import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});

const PUBLIC_ROUTES = [
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/login",
  "/auth/register",
];

api.interceptors.request.use((config) => {
  const url = config.url || "";

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    url.includes(route)
  );

  if (isPublicRoute) {
    return config;
  }

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


// ✅ HANDLE SESSION EXPIRED
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
 console.log("401 interceptor triggered");
      // clear auth
      localStorage.removeItem("token");
      localStorage.removeItem("profileData");

      // redirect to signin
      window.location.href = "/sign-in";
    }

    return Promise.reject(error);
  }
);

export default api;