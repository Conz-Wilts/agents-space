import { LoginCard } from "@/components/auth/login-card";
import { Modal } from "@/components/auth/modal";

// Client-side navigation to /login opens sign-in as a popup over the current page.
export default function LoginModal() {
  return (
    <Modal>
      <LoginCard />
    </Modal>
  );
}
