import { notFound } from 'next/navigation'
import hotels from '@/data/hotels.json'
import ItemDetail from '@/components/ItemDetail'
import { CatalogItem } from '@/lib/catalog'

export function generateStaticParams() {
  return hotels.map((h) => ({ id: h.id }))
}

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: params is a Promise and must be awaited.
  const { id } = await params
  const hotel = (hotels as CatalogItem[]).find((h) => h.id === id)

  if (!hotel) notFound()

  return <ItemDetail kind="hotels" item={hotel} />
}
