import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='max-h-full flex flex-col flex-1'>
      <SidebarProvider>
        <AppSidebar />
        <div className='w-full relative z-10'>
          <SidebarTrigger />
          {children}
        </div>
      </SidebarProvider>
    </div>
  );
}
