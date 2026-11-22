import {State,recipes,routines,days,meals,Recipe} from './data';
export const exclusions=['Huevos','Lácteos','Frutos secos','Pescado'] as const;
function norm(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
export function compatible(recipe:Recipe,prefs:State['preferences']){
 const ingredients=norm(recipe.ingredients.map(i=>i.name).join(' '));
 if(prefs.diet==='vegetariana'&&/pollo|salmon|carne|atun/.test(ingredients))return false;
 const patterns:Record<string,RegExp>={Huevos:/huevo/,Lácteos:/queso|yogur|crema|manteca/, 'Frutos secos':/nueces|almendra|mani/ ,Pescado:/salmon|atun|pescado/};
 return !prefs.exclusions.some(e=>patterns[e]?.test(ingredients));
}
export function generatePlan(week:string,prefs:State['preferences'],variation=0):State['plan']{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(week)||new Date(week+'T12:00:00Z').getUTCDay()!==1)throw Error('Elegí una semana válida que comience un lunes.');
 const available=recipes.filter(r=>r.minutes<=prefs.maxMinutes&&compatible(r,prefs));
 const result:State['plan']={};
 for(let day=0;day<7;day++)for(const meal of meals){
  const pool=available.filter(r=>meal==='Almuerzo'||meal==='Cena'?r.tag==='Almuerzo'||r.tag==='Cena':r.tag===meal);
  if(!pool.length)throw Error(`No hay recetas para ${meal.toLowerCase()} que cumplan tus exclusiones y tiempo máximo. Ampliá el tiempo o ajustá tus preferencias.`);
  const choice=pool[(day+variation+(meal==='Cena'?1:0))%pool.length];
  result[`${week}|${day}|${meal}`]={recipe:choice.id,servings:prefs.servings};
 }
 return result;
}
const home=[
 {name:'Casa · fuerza de cuerpo completo',ex:['Sentarse y levantarse de una silla','Flexiones contra la pared','Puente de glúteos','Bird dog']},
 {name:'Casa · movilidad y caminata',ex:['Caminata a ritmo cómodo','Movilidad de cadera','Dead bug']},
 {name:'Casa · fuerza y control',ex:['Sentadilla a una silla','Flexiones con apoyo elevado estable','Elevación de gemelos de pie','Bird dog']},
 {name:'Casa · movimiento suave',ex:['Caminata a ritmo cómodo','Movilidad de hombros','Movilidad de cadera']},
 {name:'Casa · fuerza de cuerpo completo',ex:['Sentarse y levantarse de una silla','Flexiones contra la pared','Puente de glúteos','Dead bug']},
 {name:'Casa · recuperación opcional',ex:['Caminata suave','Movilidad de cadera']},
 {name:'Casa · movimiento libre',ex:['Caminata suave','Movilidad de hombros']}
];
export function training(prefs:State['preferences'],customRoutines?:State['customRoutines']){const mode=prefs.gym?'gym':'home';return prefs.trainingDays.map(i=>{const base=prefs.gym?(routines[i]??{name:'Recuperación opcional',ex:['Caminata suave','Movilidad de cadera']}):home[i];const custom=customRoutines?.[`${mode}-${i}`];return {...(custom?{name:custom.name,ex:custom.ex}:base),dayIndex:i,mode:mode as 'gym'|'home',isCustom:Boolean(custom),day:days[i],time:`${prefs.minutes} minutos disponibles`}})}
export function prescription(ex:string,experience:string,week:number){if(/Caminata/.test(ex))return {sets:1,reps:10,label:'10–20 minutos a ritmo cómodo',hint:'Usá una superficie firme y un ritmo que te permita conversar.'};if(/Movilidad/.test(ex))return {sets:1,reps:5,label:'5–10 minutos de movilidad suave',hint:'Movete dentro de un rango cómodo, sin forzar.'};const sets=week===5?2:experience==='Inicial'?2:3;const hints:Record<string,string>={'Sentarse y levantarse de una silla':'Usá una silla firme apoyada contra la pared. Levantate y sentate con control.','Sentadilla a una silla':'Llevá la cadera hacia la silla con control; usá apoyo si lo necesitás.','Flexiones contra la pared':'Apoyá las manos a la altura del pecho y acercá el torso a la pared con control.','Flexiones con apoyo elevado estable':'Usá una superficie firme que no se desplace; elegí una altura cómoda.','Puente de glúteos':'Acostate boca arriba con rodillas flexionadas y elevá la cadera con control.','Bird dog':'En cuatro apoyos, extendé brazo y pierna contrarios manteniendo estable el tronco.','Dead bug':'Boca arriba, bajá brazo y pierna contrarios lentamente sin arquear la espalda.','Elevación de gemelos de pie':'Sostenete de una pared y elevá los talones con control.'};return {sets,reps:10,label:`${sets} series · 8–12 repeticiones · Descanso 60–120 s`,hint:hints[ex]??'Priorizá el control y la técnica. Elegí una carga que deje 2–3 repeticiones en reserva.'}}
export function mergeWeek(plan:State['plan'],week:string,draft:State['plan']){return {...Object.fromEntries(Object.entries(plan).filter(([key])=>!key.startsWith(week+'|'))),...draft}}
