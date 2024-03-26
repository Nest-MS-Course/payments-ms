import { Injectable } from '@nestjs/common';
import { envs } from 'src/config/envs';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {

  private readonly stripe = new Stripe(
    envs.stripe_secret
  );

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {

    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map(item => ({
      price_data: {
        currency,
        product_data: {
          name: item.name
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity
    }))

    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          orderId
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.stripe_success_url,
      cancel_url: envs.stripe_cancel_url,
    })

    return session;
  }

  async stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;
    const endpointSecret = envs.stripe_signing_secret;

    try {
      event = this.stripe.webhooks.constructEvent(req['rawBody'], sig, endpointSecret);
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }
    
    switch(event.type) {
      case 'charge.succeeded':
        const chargeSucceeded = event.data.object;
        //TODO: call ms
        console.log(chargeSucceeded.metadata);
        break;
      
      default:
        console.log(`Event ${event.type} not handled`);
    }

    return res.status(200).json((
      sig
    ))
  }
}
