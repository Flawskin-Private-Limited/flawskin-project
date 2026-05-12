import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../utils/authSession";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{
          from: location.pathname,
          message: "Session expired. Please login again.",
        }}
      />
    );
  }

  return children;
}
