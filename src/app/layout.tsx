import type {Metadata,Viewport} from "next";import "./globals.css";
export const metadata:Metadata={title:"KetoFit · Tu progreso, a tu ritmo",description:"Entrenamiento, nutrición y hábitos en un solo lugar",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"KetoFit"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#142b24"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es" suppressHydrationWarning><body>{children}</body></html>}
