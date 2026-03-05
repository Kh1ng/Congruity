import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";
import Login from "./Components/Login";
import Home from "./Components/Home";
import ErrorBoundary from "./Components/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { VoiceProvider } from "@/context/VoiceContext";

// Polyfill global for browser
window.global = window;
window.Buffer = Buffer;
window.__WS_TOKEN__ = ""; // Polyfill for Supabase Realtime

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/Login",
    element: <Login />,
  },
  {
    path: "/home",
    element: <Home />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <VoiceProvider>
          <RouterProvider router={router} />
        </VoiceProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
