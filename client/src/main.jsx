import { Buffer } from "buffer";
import process from "process";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import { SupabaseClient } from "@supabase/supabase-js";
import App from "./App";

import Login from "./Components/Login";
import VideoChat from "./Components/VideoChat";
import Home from "./Components/Home";
// Polyfill global for browser
window.global = window;
window.Buffer = Buffer;
window.process = process;

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
    path: "/VideoChat",
    element: <VideoChat />,
  },
  {
    path: "/home",
    element: <Home />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
