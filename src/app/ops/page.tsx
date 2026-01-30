import OpsClient from "./ui/OpsClient";

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ regionId?: string }>;
}) {
  const sp = await searchParams;
  const regionId = sp.regionId ?? "";

  return <OpsClient regionId={regionId} />;
}
