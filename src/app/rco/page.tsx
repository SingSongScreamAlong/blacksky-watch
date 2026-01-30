import RcoClient from "./ui/RcoClient";

export default async function RcoPage({
  searchParams,
}: {
  searchParams: Promise<{ regionId?: string }>;
}) {
  const sp = await searchParams;
  const regionId = sp.regionId ?? "";

  return <RcoClient regionId={regionId} />;
}
