import Link from "next/link";

export default function Home() {
  return (
    <section>
      Welcome to Triage app
      <Link href="/login">
        <p>Login</p>
      </Link>
    </section>
  );
}
