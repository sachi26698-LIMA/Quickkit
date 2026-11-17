import { redirect } from "next/navigation";
// A page title of its own. Without one, this route inherits the layout
// `title.default` ("… | QUICKKIT") and the template appends the brand
// again, producing "… | QUICKKIT | QUICKKIT".
export const metadata = {
  title: "Create an account",
  description:
    "QUICKKIT accounts are not open. All 56 tools are free to use without registering, so you are being taken to the tool catalogue.",
  robots: { index: false, follow: false },
};
export default function PublicSignupRemoved() {
  redirect("/tools?account=disabled");
}
