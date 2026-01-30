import OutpostClient from "./ui/OutpostClient";

export default async function OutpostPage({
  searchParams,
}: {
  searchParams: Promise<{ regionId?: string; outpostCode?: string }>;
}) {
  const sp = await searchParams;
  const regionId = sp.regionId ?? "";
  const outpostCode = sp.outpostCode ?? "";

  return <OutpostClient regionId={regionId} outpostCode={outpostCode} />;
}
