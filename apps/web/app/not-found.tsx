import Link from "next/link";
import { AppPage } from "@/components/landing/app-page";
import { PageTitle } from "@/components/landing/directory";

export default function NotFound() {
  return (
    <AppPage>
      <section data-animate className="flex flex-col gap-10 px-5 pt-10 pb-24 sm:px-10 lg:px-20 lg:pt-16 lg:pb-32">
        <PageTitle eyebrow="404" title="Nothing lives here." />
        <Link
          href="/directory"
          className="r w-fit rounded-lg bg-ink px-5 py-3 text-[15px] font-medium text-white transition-transform duration-200 hover:-translate-y-px active:scale-[0.98]"
        >
          Browse the directory
        </Link>
      </section>
    </AppPage>
  );
}
