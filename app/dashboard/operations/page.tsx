import { redirect } from "next/navigation";

export default function OperationsRedirect() {
    redirect("/dashboard/operations/overview");
}
