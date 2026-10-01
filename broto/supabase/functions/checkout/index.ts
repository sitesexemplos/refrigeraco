import {endpoint,authenticate,stripe,site,env,json,PublicError} from '../_shared/core.ts';
endpoint(async req=>{
 const {db,user}=await authenticate(req),s=stripe();
 if(!user.email_confirmed_at)throw new PublicError('Confirme seu e-mail antes de assinar.',403);
 const {data:existing,error}=await db.from('subscriptions').select('*').eq('user_id',user.id).maybeSingle();if(error)throw error;
 let customer=existing?.stripe_customer_id;
 if(!customer){const c=await s.customers.create({email:user.email,metadata:{supabase_user_id:user.id}},{idempotencyKey:`broto-customer-${user.id}`});customer=c.id;const {error}=await db.from('subscriptions').upsert({user_id:user.id,stripe_customer_id:customer},{onConflict:'user_id',ignoreDuplicates:true});if(error)throw error;}
 const subscriptions=await s.subscriptions.list({customer,status:'all',limit:100});
 if(subscriptions.data.some(v=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(v.status))){const portal=await s.billingPortal.sessions.create({customer,return_url:site()+'/#jardim'});return json(req,{url:portal.url});}
 const price=await s.prices.retrieve(env('STRIPE_PRICE_ID'));
 if(!price.active||price.currency!=='brl'||price.unit_amount!==4700||price.recurring?.interval!=='month'||price.recurring.interval_count!==1)throw new Error('Expected a BRL 4700 monthly price');
 const open=await s.checkout.sessions.list({customer,status:'open',limit:100});
 const reusable=open.data.find(v=>v.mode==='subscription'&&v.metadata?.broto_price===price.id);
 if(reusable?.url)return json(req,{url:reusable.url});
 const bucket=Math.floor(Date.now()/(31*60*1000));
 const session=await s.checkout.sessions.create({mode:'subscription',customer,client_reference_id:user.id,line_items:[{price:price.id,quantity:1}],payment_method_types:['card'],metadata:{supabase_user_id:user.id,broto_price:price.id},subscription_data:{metadata:{supabase_user_id:user.id}},success_url:site()+'/#pagamento',cancel_url:site()+'/#jardim'},{idempotencyKey:`broto-checkout-${user.id}-${bucket}`});
 return json(req,{url:session.url});
});
