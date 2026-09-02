import { notFound } from 'next/navigation'
import experiences from '@/data/experiences.json'
import ItemDetail from '@/components/ItemDetail'
import { CatalogItem } from '@/lib/catalog'

export function generateStaticParams() {
  return experiences.map((e) => ({ id: e.id }))
}

export default async function ExperienceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: params is a Promise and must be awaited.
  const { id } = await params
  const experience = (experiences as CatalogItem[]).find((e) => e.id === id)

  if (!experience) notFound()

  return <ItemDetail kind="experiences" item={experience} />
}
