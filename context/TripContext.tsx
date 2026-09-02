'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type ParsedTrip = {
  destination: string | null
  duration_days: number | null
  budget_inr: number | null
  travelers: number | null
}

export type Flight = {
  id: string
  airline: string
  flight_no: string
  price_inr: number
  [key: string]: unknown
}

export type Hotel = {
  id: string
  name: string
  price_per_night_inr: number
  [key: string]: unknown
}

type TripState = {
  parsedTrip: ParsedTrip | null
  selectedFlight: Flight | null
  selectedHotel: Hotel | null
  bookingRef: { pnr: string; hotelRef: string } | null
}

type TripContextValue = TripState & {
  setParsedTrip: (t: ParsedTrip) => void
  setSelectedFlight: (f: Flight | null) => void
  setSelectedHotel: (h: Hotel | null) => void
  setBookingRef: (b: { pnr: string; hotelRef: string } | null) => void
  // GST: 5% flights, 12% hotels above ₹7,500/night — feature 6 from the roadmap
  budgetBreakdown: () => {
    flightCost: number
    hotelCost: number
    flightTax: number
    hotelTax: number
    total: number
  }
}

const TripContext = createContext<TripContextValue | undefined>(undefined)

export function TripProvider({ children }: { children: ReactNode }) {
  const [parsedTrip, setParsedTrip] = useState<ParsedTrip | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [bookingRef, setBookingRef] = useState<{ pnr: string; hotelRef: string } | null>(
    null
  )

  function budgetBreakdown() {
    const nights = parsedTrip?.duration_days ?? 1
    const travelers = parsedTrip?.travelers ?? 1

    const flightCost = (selectedFlight?.price_inr ?? 0) * travelers
    const hotelCost = (selectedHotel?.price_per_night_inr ?? 0) * nights

    const flightTax = flightCost * 0.05
    const hotelTax = hotelCost > 7500 ? hotelCost * 0.12 : hotelCost * 0.05

    return {
      flightCost,
      hotelCost,
      flightTax,
      hotelTax,
      total: flightCost + hotelCost + flightTax + hotelTax,
    }
  }

  return (
    <TripContext.Provider
      value={{
        parsedTrip,
        selectedFlight,
        selectedHotel,
        bookingRef,
        setParsedTrip,
        setSelectedFlight,
        setSelectedHotel,
        setBookingRef,
        budgetBreakdown,
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

export function useTrip() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTrip must be used within a TripProvider')
  return ctx
}
