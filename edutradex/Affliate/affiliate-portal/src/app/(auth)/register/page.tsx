import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your OptigoBroker Partners account and start earning",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
