import { Suspense } from "react";
import { PublishedView } from "./PublishedView";

async function Slug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublishedView slug={slug} />;
}

export default function PublishedLandingPage({ params }: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Slug params={params} />
    </Suspense>
  );
}
