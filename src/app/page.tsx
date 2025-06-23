import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Login } from "./login/page";

export default function HomePage() {
  return (
    <div>
      <Link
        href="/products"
        className={buttonVariants()}
      >
        Products
      </Link>
      <Avatar>
        <AvatarImage src="" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>

      <div>
        <Login />
      </div>
    </div>
  );
}
