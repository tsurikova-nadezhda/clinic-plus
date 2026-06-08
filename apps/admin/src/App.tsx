import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Doctors } from "./pages/Doctors";
import { DoctorPlan } from "./pages/DoctorPlan";
import { Activities } from "./pages/Activities";
import { News } from "./pages/News";
import { Cases } from "./pages/Cases";
import { Stats } from "./pages/Stats";
import { Security } from "./pages/Security";

function Routed() {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted" style={{ padding: 24 }}>Загрузка…</p>;
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:userId" element={<DoctorPlan />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/news" element={<News />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/security" element={<Security />} />
        <Route path="*" element={<Navigate to="/doctors" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </BrowserRouter>
  );
}
