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

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F1923]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/market" />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

export function AppRouter() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      
      <Route path="/">
        {user ? <Redirect to="/market" /> : <Redirect to="/login" />}
      </Route>

      <Route path="/market" component={() => <ProtectedRoute component={Market} />} />
      <Route path="/cargo" component={() => <ProtectedRoute component={Cargo} />} />
      <Route path="/market/shipments" component={() => <ProtectedRoute component={Shipments} />} />
      <Route path="/market/shipments/:id" component={() => <ProtectedRoute component={ShipmentDetail} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
      <Route path="/tracker" component={() => <ProtectedRoute component={Tracker} />} />
      <Route path="/guild" component={() => <ProtectedRoute component={Guild} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      
      <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} adminOnly />} />

      <Route component={NotFound} />
    </Switch>
  );
}
