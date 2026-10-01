import Stripe from 'npm:stripe@18.5.0';
import {stripe,admin,env} from '../_shared/core.ts';
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const signature=req.headers.get('stripe-signature');if(!signature)return new Response('Missing signature',{status:400});
 const s=stripe();let event:Stripe.Event;
 try{event=await s.webhooks.constructEventAsync(await req.text(),signature,env('STRIPE_WEBHOOK_SECRET'),undefined,Stripe.createSubtleCryptoProvider());}catch{return new Response('Invalid signature',{status:400});}
 try{
 let subscriptionId:string|undefined;
 if(event.type.startsWith('customer.subscription.'))subscriptionId=(event.data.object as Stripe.Subscription).id;
 else if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){const v=event.data.object as Stripe.Checkout.Session;subscriptionId=typeof v.subscription==='string'?v.subscription:v.subscription?.id;}
 else if(['invoice.paid','invoice.payment_failed'].includes(event.type)){const v=event.data.object as Stripe.Invoice;const raw=(v as any).parent?.subscription_details?.subscription||(v as any).subscription;subscriptionId=typeof raw==='string'?raw:raw?.id;}
 if(!subscriptionId)return new Response('Ignored',{status:200});
 // Retrieve current canonical state, rather than trusting stale webhook object.
 const sub=await s.subscriptions.retrieve(subscriptionId);
 const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
 const db=admin();const {data:owner,error}=await db.from('subscriptions').select('user_id,stripe_subscription_id,status').eq('stripe_customer_id',customer).maybeSingle();if(error)throw error;
 if(!owner)return new Response('Unknown customer',{status:200});
 if(sub.metadata.supabase_user_id!==owner.user_id)throw Error('Owner mismatch');
 // A late deletion of an old subscription must not revoke a newer one.
 if(owner.stripe_subscription_id&&owner.stripe_subscription_id!==sub.id&&sub.status==='canceled')return new Response('Old subscription ignored');
 const item=sub.items.data.find(v=>v.price.id===env('STRIPE_PRICE_ID'));
 if(!item)throw Error('Unexpected price');
 const period=(item as any).current_period_end||(sub as any).current_period_end;
 const {error:applyError}=await db.rpc('apply_stripe_event',{p_event:event.id,p_created:event.created,p_user:owner.user_id,p_customer:customer,p_subscription:sub.id,p_status:sub.status,p_end:period?new Date(period*1000).toISOString():null,p_cancel:sub.cancel_at_period_end});if(applyError)throw applyError;
 return new Response('OK');
 }catch{console.error('Webhook processing failed');return new Response('Retry later',{status:500});}
});
