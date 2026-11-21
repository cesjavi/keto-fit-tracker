import {z} from 'zod';
export const vitaminDSchema=z.object({labs:z.array(z.object({id:z.string().min(1).max(100),date:z.iso.date(),value:z.number().positive().max(2000),unit:z.enum(['nmol/L','ng/mL']),note:z.string().max(300)})).max(5000)});
export type VitaminDData=z.infer<typeof vitaminDSchema>;
export function nmol(value:number,unit:'nmol/L'|'ng/mL'){return unit==='ng/mL'?value*2.5:value}
export const nominalMED=[{type:'I',med:200},{type:'II',med:250},{type:'III',med:350},{type:'IV',med:450},{type:'V',med:600},{type:'VI',med:1000}];
export function theoreticalVitaminD(uv:number,minutes:number,exposedPercent:number,med:number){
 if(![uv,minutes,exposedPercent,med].every(Number.isFinite)||uv<0||uv>30||minutes<0||minutes>120||exposedPercent<=0||exposedPercent>100||med<100||med>2000)throw Error('Revisá los valores del modelo.');
 const dose=uv*minutes*60/40;
 return {erythemalDose:dose,sed:dose/100,medFraction:dose/med,theoreticalIU:21120*dose*(exposedPercent/100)/med,withinLowDose:dose<=med*.25};
}
