import { ReactNode, lazy, Suspense, Component, ErrorInfo } from "react";
import Header from "./Header";
import Footer from "./Footer";

const CookieConsent = lazy(() => import("@/components/gdpr/CookieConsent"));

class LazyErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.warn("CookieConsent failed to load:", e); }
  render() { return this.state.failed ? null : this.props.children; }
}

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
      <LazyErrorBoundary>
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
      </LazyErrorBoundary>
    </div>
  );
};

export default Layout;
