import { redirect } from "next/navigation";
// A page title of its own. Without one, this route inherits the layout
// `title.default` ("… | QUICKKIT") and the template appends the brand
// again, producing "… | QUICKKIT | QUICKKIT".
export const metadata = {
  title: "Your account",
  description:
    "Account settings are not part of QUICKKIT. Tools you save are kept in this browser only, and you are being taken to your saved tools.",
  robots: { index: false, follow: false },
};
export default function PublicAccountRemoved() {
  redirect("/saved");
}
