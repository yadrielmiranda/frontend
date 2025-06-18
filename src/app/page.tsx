import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";


export default function HomePage() {
  return (
    <div>
      <Link
        href="/products"
        className={buttonVariants()}
      >
      Products  
      </Link>
            
    </div>
  );
}
