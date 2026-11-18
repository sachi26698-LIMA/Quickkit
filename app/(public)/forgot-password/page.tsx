import { redirect } from "next/navigation";
// A page title of its own. Without one, this route inherits the layout
// `title.default` ("… | QUICKKIT") and the template appends the brand
// again, producing "… | QUICKKIT | QUICKKIT".
export const metadata = {
  title: "Reset your password",
  description:
    "Password recovery is not part of QUICKKIT because tools need no account. You are being taken back to the tool catalogue.",
  robots: { index: false, follow: false },
};
export default function PublicRecoveryRemoved() {
  redirect("/tools");
}
