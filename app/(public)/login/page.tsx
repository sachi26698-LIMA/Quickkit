import { redirect } from "next/navigation";
// A page title of its own. Without one, this route inherits the layout
// `title.default` ("… | QUICKKIT") and the template appends the brand
// again, producing "… | QUICKKIT | QUICKKIT".
export const metadata = {
  title: "Sign in",
  description:
    "Sign-in is not open on QUICKKIT. Every tool works without an account, so you are being taken to the full tool catalogue instead.",
  robots: { index: false, follow: false },
};
export default function PublicLoginRemoved() {
  redirect("/tools?account=disabled");
}
