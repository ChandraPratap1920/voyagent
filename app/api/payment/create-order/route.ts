import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase-server'

// A sane ceiling. Razorpay would happily create an order for ₹10 crore, and an
// unbounded amount from the client is not something to hand to a payment
// provider.
const MAX_ORDER_INR = 2_000_000

export async function POST(req: NextRequest) {
  // Every other user-scoped route checks this; order creation was the one that
  // didn't, which let anyone create Razorpay orders against this account.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const { amountInr } = await req.json()

  if (!amountInr || typeof amountInr !== 'number' || !Number.isFinite(amountInr) || amountInr <= 0) {
    return NextResponse.json({ error: 'amountInr is required' }, { status: 400 })
  }
  if (amountInr > MAX_ORDER_INR) {
    return NextResponse.json({ error: 'amount exceeds the permitted maximum' }, { status: 400 })
  }

  const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })

  try {
    // Razorpay amounts are in paise, and receipts must stay short.
    const order = await razorpay.orders.create({
      amount: Math.round(amountInr) * 100,
      currency: 'INR',
      receipt: `voy_${Date.now()}`,
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (err) {
    console.error('create-order error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
  }
}
