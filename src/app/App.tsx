import { AuthProvider } from "./context/AuthContext";
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
