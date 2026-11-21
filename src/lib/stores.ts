import {z} from 'zod';
export const storeCatalog=[
 {id:'coto',name:'Coto',home:'https://www.coto.com.ar/',country:'Argentina',color:'#d62b37',mark:'C'},
 {id:'carrefour',name:'Carrefour',home:'https://www.carrefour.com.ar/',country:'Argentina',color:'#2469aa',mark:'C'},
 {id:'dia',name:'Día',home:'https://diaonline.supermercadosdia.com.ar/',country:'Argentina',color:'#dc2935',mark:'D'},
 {id:'jumbo',name:'Jumbo',home:'https://www.jumbo.com.ar/',country:'Argentina',color:'#277440',mark:'J'},
 {id:'disco',name:'Disco',home:'https://www.disco.com.ar/',country:'Argentina',color:'#a4233d',mark:'D'},
 {id:'vea',name:'Vea',home:'https://www.vea.com.ar/',country:'Argentina',color:'#b88b17',mark:'V'},
 {id:'la-anonima',name:'La Anónima',home:'https://supermercado.laanonimaonline.com/',country:'Argentina',color:'#2671b7',mark:'A'}
] as const;
export const website=z.url().max(500).refine(value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password}catch{return false}},'Usá una dirección HTTPS sin credenciales.');
export const customStoreSchema=z.object({id:z.string().regex(/^custom-[a-zA-Z0-9-]{1,80}$/),name:z.string().trim().min(1).max(80),home:website});
export const cityLocationSchema=z.object({id:z.string().min(1).max(100),country:z.string().trim().min(2).max(60),region:z.string().trim().max(80),city:z.string().trim().min(2).max(80),storeIds:z.array(z.string().min(1).max(100)).min(1).max(20),customStores:z.array(customStoreSchema).max(12),preferredId:z.string().min(1).max(100)}).superRefine((loc,ctx)=>{
 const available=new Set([...storeCatalog.filter(s=>normalize(s.country)===normalize(loc.country)).map(s=>String(s.id)),...loc.customStores.map(s=>s.id)]);
 if(new Set(loc.customStores.map(s=>s.id)).size!==loc.customStores.length||new Set(loc.storeIds).size!==loc.storeIds.length)ctx.addIssue({code:'custom',message:'Hay supermercados repetidos.'});
 if(loc.storeIds.some(id=>!available.has(id))||!loc.storeIds.includes(loc.preferredId))ctx.addIssue({code:'custom',message:'Seleccioná supermercados válidos y un preferido de la lista.'});
});
export const shoppingConfigSchema=z.object({activeId:z.string().max(100).nullable(),locations:z.array(cityLocationSchema).max(20)}).superRefine((config,ctx)=>{if(new Set(config.locations.map(l=>l.id)).size!==config.locations.length||(config.activeId!==null&&!config.locations.some(l=>l.id===config.activeId)))ctx.addIssue({code:'custom',message:'La ubicación activa no es válida.'})});
export type ShoppingConfig=z.infer<typeof shoppingConfigSchema>;
export type CityLocation=z.infer<typeof cityLocationSchema>;
export type Store={id:string;name:string;home:string;color:string;mark:string};
export function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
export function resolveStores(location:CityLocation|null):Store[]{if(!location)return [...storeCatalog.slice(0,3)];const candidates:Store[]=[...storeCatalog,...location.customStores.map(s=>({...s,color:'#537e52',mark:s.name[0].toUpperCase()}))];return location.storeIds.map(id=>candidates.find(s=>s.id===id)).filter((s):s is Store=>!!s)}
