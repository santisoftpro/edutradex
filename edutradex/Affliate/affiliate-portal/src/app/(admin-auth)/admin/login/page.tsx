import type { Metadata } from "next";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Sign in to the admin panel",
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
