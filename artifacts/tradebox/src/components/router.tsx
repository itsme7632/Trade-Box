import { Switch, Route, Redirect, useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { AppLayout } from "@/components/layout";
import { AuthPage } from "@/pages/auth";
import NotFound from "@/pages/not-found";
import Market from "@/pages/market";
import Cargo from "@/pages/cargo";
import Shipments from "@/pages/shipments";
import ShipmentDetail from "@/pages/shipment-detail";
import Wallet from "@/pages/wallet";
import Tracker from "@/pages/tracker";
import Guild from "@/pages/guild";
import ProfilePage from "@/pages/profile";
import AdminDashboard from "@/pages/admin";
import { Loader2 } from "lucide-react";
import { memo, type ComponentType } from "react";

function PageWrapper({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return (
    <div className="page active" key={pageKey}>
      {children}
    </div>
  );
}

function ProtectedLayout({
  component: Component,
  adminOnly = false,
}: {
  component: ComponentType;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F7FB]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/market" />;

  return (
    <AppLayout>
      <PageWrapper pageKey={location}>
        <Component />
      </PageWrapper>
    </AppLayout>
  );
}

// Stable named route components — never use arrow functions as route components.
// Each is wrapped in memo to prevent re-renders when parent state changes.
const RouteShipmentDetail = memo(function RouteShipmentDetail() {
  return <ProtectedLayout component={ShipmentDetail} />;
});
const RouteShipments = memo(function RouteShipments() {
  return <ProtectedLayout component={Shipments} />;
});
const RouteMarket = memo(function RouteMarket() {
  return <ProtectedLayout component={Market} />;
});
const RouteCargo = memo(function RouteCargo() {
  return <ProtectedLayout component={Cargo} />;
});
const RouteWallet = memo(function RouteWallet() {
  return <ProtectedLayout component={Wallet} />;
});
const RouteTracker = memo(function RouteTracker() {
  return <ProtectedLayout component={Tracker} />;
});
const RouteGuild = memo(function RouteGuild() {
  return <ProtectedLayout component={Guild} />;
});
const RouteProfile = memo(function RouteProfile() {
  return <ProtectedLayout component={ProfilePage} />;
});
const RouteAdmin = memo(function RouteAdmin() {
  return <ProtectedLayout component={AdminDashboard} adminOnly />;
});

function RootRedirect() {
  const { user } = useAuth();
  return <Redirect to={user ? "/market" : "/login"} />;
}

export function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />

      {/* Most-specific routes first — prevents prefix shadowing */}
      <Route path="/market/shipments/:id" component={RouteShipmentDetail} />
      <Route path="/market/shipments" component={RouteShipments} />
      <Route path="/market" component={RouteMarket} />
      <Route path="/tracker" component={RouteTracker} />
      <Route path="/cargo" component={RouteCargo} />
      <Route path="/wallet" component={RouteWallet} />
      <Route path="/guild" component={RouteGuild} />
      <Route path="/profile" component={RouteProfile} />
      <Route path="/admin" component={RouteAdmin} />

      <Route path="/" component={RootRedirect} />
      <Route component={NotFound} />
    </Switch>
  );
}
