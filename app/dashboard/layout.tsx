'use client';

import { useState } from 'react';
import { RoleGate } from '@/components/auth/RoleGate';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { RetentionBanner } from '@/components/dashboard/RetentionBanner';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <RoleGate minRole="manager">
      <div className="flex h-screen w-full flex-col md:flex-row bg-background text-foreground transition-colors duration-200 overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex md:hidden items-center justify-between border-b bg-card/65 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-lg"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <span className="font-bold text-sm tracking-tight text-primary dark:text-foreground">BVQT Tracking</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
 
        {/* Desktop Sidebar (Hidden on mobile) */}
        <div className="hidden md:flex h-screen w-60 shrink-0 sticky top-0">
          <DashboardSidebar />
        </div>

        {/* Mobile Menu Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Menu container */}
            <div className="relative flex flex-col w-64 max-w-xs bg-card border-r p-4 shadow-2xl animate-in slide-in-from-left duration-250">
              <div className="flex items-center justify-between mb-5 px-2">
                <span className="font-bold text-sm tracking-tight text-primary dark:text-foreground">Danh mục</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="size-7 rounded-md"
                >
                  <X className="size-4" />
                </Button>
              </div>
              
              {/* Render DashboardSidebar inside mobile drawer with close trigger */}
              <div className="flex-1 overflow-y-auto">
                <DashboardSidebar onNavItemClick={() => setMobileMenuOpen(false)} isMobile />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="px-4 pt-4 md:px-6 md:pt-6 empty:hidden">
            <RetentionBanner />
          </div>
          {children}
        </div>
      </div>
    </RoleGate>
  );
}

