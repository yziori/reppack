import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <main className="flex h-screen flex-col bg-paper-1">
      <Outlet />
    </main>
  );
}
