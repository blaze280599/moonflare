import { notFound } from 'next/navigation';
import GroupPage from '@/components/GroupPage';
import { GROUPS, GROUP_BY_SLUG } from '@/lib/cards';

export function generateStaticParams() {
  return GROUPS.map(g => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const group = GROUP_BY_SLUG[slug];
  return group ? { title: group.name, description: group.blurb } : {};
}

export default async function Page({ params }) {
  const { slug } = await params;
  if (!GROUP_BY_SLUG[slug]) notFound();
  return <GroupPage slug={slug} />;
}
