import AuthForm from "@/components/auth/AuthForm";

export const metadata = { title: "Accedi" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
