import RegistrationForm from "./registration-form";
import { getRegistrationSections } from "@/features/public/registration/services";

export default async function RegisterPage() {
  const sections = await getRegistrationSections();
  return <RegistrationForm initialSections={sections} />;
}
