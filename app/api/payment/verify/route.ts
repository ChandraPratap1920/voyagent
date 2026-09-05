import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase-server'

// Called from the client after Razorpay's checkout.js returns a success
// callback. Verifies the signature server-side (never trust the client
// alone), then writes a booking row and returns a fake PNR/hotel ref.
export async function POST(req: NextRequest) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, trip, trip_id } =
    await req.json()

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  const pnr = `VG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const hotelRef = `HTL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.from('bookings').insert({
      user_id: user.id,
      destination: trip?.destination ?? null,
      trip_cost_inr: trip?.total_cost ?? null,
      payment_id: razorpay_payment_id,
      pnr,
      hotel_ref: hotelRef,
      status: 'confirmed',
      // Recorded so the booking can link back to the itinerary it paid for.
      trip_id: typeof trip_id === 'string' && trip_id ? trip_id : null,
    })

    // When the payment came from the itinerary builder, flip that trip to
    // booked so the planner shows the confirmation instead of a pay button.
    if (typeof trip_id === 'string' && trip_id) {
      await supabase
        .from('trips')
        .update({ status: 'booked', updated_at: new Date().toISOString() })
        .eq('id', trip_id)
        .eq('user_id', user.id)
    }
  }

  return NextResponse.json({ pnr, hotelRef, status: 'confirmed' })
}
