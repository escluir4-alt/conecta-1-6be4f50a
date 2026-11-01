import { z } from 'zod';
export const BRAZIL_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;
export const pixRecipientSchema=z.object({key:z.string().trim().min(1).max(77),name:z.string().trim().min(1).max(200),city:z.string().trim().min(1).max(200)});
export const savedRecipientSchema=pixRecipientSchema.extend({state:z.enum(BRAZIL_STATES)});
export type PixRecipient=z.infer<typeof savedRecipientSchema>;
export const emptyRecipient:PixRecipient={key:'',name:'',state:'DF',city:'Brasília'};
export function pixMerchantText(value:string,max:number){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().slice(0,max).trim();}