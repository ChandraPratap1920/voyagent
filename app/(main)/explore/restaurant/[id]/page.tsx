import { notFound } from 'next/navigation'
import restaurants from '@/data/restaurants.json'
import ItemDetail from '@/components/ItemDetail'
import { CatalogItem } from '@/lib/catalog'

export function generateStaticParams() {
  return restaurants.map((r) => ({ id: r.id }))
}

export default async function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: params is a Promise and must be awaited.
  const { id } = await params
  const restaurant = (restaurants as CatalogItem[]).find((r) => r.id === id)

  if (!restaurant) notFound()

  return <ItemDetail kind="restaurants" item={restaurant} />
}
