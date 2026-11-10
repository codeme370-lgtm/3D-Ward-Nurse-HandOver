import { AuthProvider } from "@/context/AuthContext";
import WardAppFooter from "./WardAppFooter";
import "./globals.css";
import "./ward-handover.css";

export const metadata = {
    title: "NIC Safety Briefing & Handover | Ward 3D",
    description: "Ward 3D nurse-in-charge safety briefing and digital handover workspace.",
    keywords: ["Ward 3D", "nurse handover", "safety briefing", "Barts Health"],
    robots: { index: false, follow: false },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif' }}>
                <AuthProvider>
                    {children}
                    <WardAppFooter />
                </AuthProvider>
            </body>
        </html>
    );
}
