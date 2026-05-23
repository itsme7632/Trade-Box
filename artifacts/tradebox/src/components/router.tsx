import { Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/components/auth-context";
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
import type { ComponentType } from "react";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return <div className="page active">{children}</div>;
}

function ProtectedLayout({
  component: Component,
  adminOnly = false,
}: {
  component: ComponentType;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F1923]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/market" />;

  return (
    <AppLayout>
      <PageWrapper>
        <Component />
      </PageWrapper>
    </AppLayout>
  );
}

function RouteShipmentDetail() {
  return <ProtectedLayout component={ShipmentDetail} />;
}
function RouteShipments() {
  return <ProtectedLayout component={Shipments} />;
}
function RouteMarket() {
  return <ProtectedLayout component={Market} />;
}
function RouteCargo() {
  return <ProtectedLayout component={Cargo} />;
}
function RouteWallet() {
  return <ProtectedLayout component={Wallet} />;
}
function RouteTracker() {
  return <ProtectedLayout component={Tracker} />;
}
function RouteGuild() {
  return <ProtectedLayout component={Guild} />;
}
function RouteProfile() {
  return <ProtectedLayout component={ProfilePage} />;
}
function RouteAdmin() {
  return <ProtectedLayout component={AdminDashboard} adminOnly />;
}

function RootRedirect() {
  const { user } = useAuth();
  return <Redirect to={user ? "/market" : "/login"} />;
}

export function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />

      {/* Most-specific routes first to prevent prefix shadowing */}
      <Route path="/market/shipments/:id" component={RouteShipmentDetail} />
      <Route path="/market/shipments" component={RouteShipments} />
      <Route path="/market" component={RouteMarket} />
      <Route path="/cargo" component={RouteCargo} />
      <Route path="/wallet" component={RouteWallet} />
      <Route path="/tracker" component={RouteTracker} />
      <Route path="/guild" component={RouteGuild} />
      <Route path="/profile" component={RouteProfile} />
      <Route path="/admin" component={RouteAdmin} />

      <Route path="/" component={RootRedirect} />
      <Route component={NotFound} />
    </Switch>
  );
}
