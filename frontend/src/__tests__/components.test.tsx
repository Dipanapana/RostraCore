import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation for all tests
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("PageHeader", () => {
  it("renders title", async () => {
    const { default: PageHeader } = await import(
      "@/components/ui/PageHeader"
    );
    render(<PageHeader title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("renders subtitle", async () => {
    const { default: PageHeader } = await import(
      "@/components/ui/PageHeader"
    );
    render(<PageHeader title="Main" subtitle="Sub text" />);
    expect(screen.getByText("Sub text")).toBeInTheDocument();
  });

  it("renders back link when backHref provided", async () => {
    const { default: PageHeader } = await import(
      "@/components/ui/PageHeader"
    );
    render(
      <PageHeader title="Detail" backHref="/list" backLabel="Back to list" />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/list");
  });

  it("renders without back link when backHref not provided", async () => {
    const { default: PageHeader } = await import(
      "@/components/ui/PageHeader"
    );
    render(<PageHeader title="No Back" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("Modal", () => {
  it("renders children when open", async () => {
    const { default: Modal } = await import("@/components/ui/Modal");
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText("Modal content")).toBeInTheDocument();
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("does not render when closed", async () => {
    const { default: Modal } = await import("@/components/ui/Modal");
    render(
      <Modal isOpen={false} onClose={() => {}} title="Hidden">
        <p>Hidden content</p>
      </Modal>
    );
    expect(screen.queryByText("Hidden content")).toBeNull();
  });
});

describe("EmptyState", () => {
  it("renders title and description", async () => {
    const { default: EmptyState } = await import(
      "@/components/ui/EmptyState"
    );
    // EmptyState requires icon (LucideIcon), title, description
    const MockIcon = (props: any) => <svg {...props} />;
    render(
      <EmptyState
        icon={MockIcon as any}
        title="No items found"
        description="Try adding some items"
      />
    );
    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(screen.getByText("Try adding some items")).toBeInTheDocument();
  });
});

describe("TopHeader", () => {
  it("renders without crashing", async () => {
    // Mock the notifications API
    vi.mock("@/services/api", () => ({
      api: {
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
      },
      notificationsApi: {
        getAll: vi.fn().mockResolvedValue({ data: { unread_count: 0 } }),
      },
    }));

    const { default: TopHeader } = await import(
      "@/components/layout/TopHeader"
    );
    render(<TopHeader />);
    // Should render the notification bell
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });
});
