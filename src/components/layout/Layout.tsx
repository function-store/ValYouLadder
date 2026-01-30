import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import CookieConsent from "@/components/gdpr/CookieConsent";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background grid-pattern flex flex-col">
      <Header />
      <main className="pt-16 flex-1">
        {children}
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Layout;
