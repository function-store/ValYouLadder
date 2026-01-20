import { ReactNode } from "react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background grid-pattern">
      <Header />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default Layout;
