import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ProgressOverlay } from "../components/ProgressOverlay";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-950 text-white">
      <Outlet />
      <ProgressOverlay />
    </main>
  );
}
