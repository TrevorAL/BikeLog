import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type FitPageProps = {
  searchParams?: Promise<{
    open?: string;
  }>;
};

export default async function FitPage({ searchParams }: FitPageProps) {
  const open = (await searchParams)?.open;
  redirect(open ? `/fit/bike?open=${encodeURIComponent(open)}` : "/fit/bike");
}
