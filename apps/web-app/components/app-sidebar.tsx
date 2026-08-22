'use client';

import { LogoWideSvg } from '@/app/splash-screen/LogoWide.svg';
import { LogoIconSvg } from '@/components/logo/LogoIcon.svg';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Marker, MarkerContent } from '@/components/ui/marker';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { useIpAddress } from '@/hooks/useIpAddress';
import { cn } from '@/lib/utils';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

const Header = () => {
  const { ipAddress, portNumber, ipChanged } = useIpAddress();

  return (
    <SidebarHeader>
      <div className='group/sidebar-header px-2 py-4 flex items-center gap-2'>
        <LogoIconSvg className='w-12 h-fit' />
        <div className='text-left'>
          <div className='font-black [text-box:trim-both] cursor-default select-none'>Pinnacle</div>
          <div className='relative text-xs grid grid-cols-[0fr_auto] group-hover/sidebar-header:grid-cols-[1fr_auto] transition-all duration-300 ease-out delay-1000 group-hover/sidebar-header:delay-0'>
            <span className='overflow-hidden text-muted-foreground'>http://</span>
            <span className='text-muted-foreground'>
              {ipAddress}:{portNumber}
            </span>
            <span
              className={cn(
                'absolute block pointer-events-none inset-y-0 h-fit left-full ml-2 text-amber-200 transition-opacity duration-300 rounded-full bg-amber-700 px-2 my-auto',
                { 'opacity-0': !ipChanged },
              )}>
              Updated
            </span>
          </div>
        </div>
      </div>
    </SidebarHeader>
  );
};

// Setup Guide
const setupGuide = [
  {
    title: <span>Connect to Home Wi-Fi</span>,
    description: (
      <span>
        Ensure your computer is on a home Wi-Fi network. Avoid public Wi-Fi at cafes or hotels, which blocks devices
        from connecting to each other.
      </span>
    ),
  },
  {
    title: <span>Set Network to Private (Windows)</span>,
    description: (
      <span>
        Go to your Windows network settings and confirm your connection type is set to <strong>Private</strong> (Public
        mode blocks local sharing).
      </span>
    ),
  },
  {
    title: <span>Launch the App & Allow Access</span>,
    description: (
      <span>
        Open the application. If a security or firewall window pops up asking for network permissions, click{' '}
        <strong>Allow</strong> or <strong>Grant Access</strong>.
      </span>
    ),
  },
  {
    title: <span>Find the Address on Your Screen</span>,
    description: (
      <span>
        Look at the app window to find the web address displayed on screen (formatted as{' '}
        <code>http://&lt;IP&gt;:&lt;PORT&gt;</code>).{' '}
        <em>
          Note: Your IP address can change if you restart your computer or reconnect to Wi-Fi—always check the app
          screen for the current address.
        </em>
      </span>
    ),
  },
  {
    title: <span>Share the Address</span>,
    description: (
      <span>
        Type or send that exact <code>http://&lt;IP&gt;:&lt;PORT&gt;</code> address into the web browser on the other
        device.
      </span>
    ),
  },
];

// Troubleshooting Guide
const troubleshootingGuide = [
  {
    title: <span>Check for IP Changes</span>,
    description: (
      <span>
        If the connection drops or stops working, check the app screen on your main computer to see if the IP address
        updated, and enter the new address on your second device.
      </span>
    ),
  },
  {
    title: <span>Turn Off VPNs</span>,
    description: (
      <span>
        Disable any active VPN software on both your computer and the second device, as VPNs block local network
        communication.
      </span>
    ),
  },
  {
    title: <span>Verify Wi-Fi Connection</span>,
    description: (
      <span>
        Double-check that both devices are on the exact same Wi-Fi network (not a guest network, mobile hotspot, or
        neighbor's Wi-Fi).
      </span>
    ),
  },
  {
    title: <span>Check Firewall Permissions</span>,
    description: (
      <span>
        If you clicked "Block" on the firewall prompt, open your computer's firewall settings and allow the app access
        on Private networks.
      </span>
    ),
  },
];

const Instructions = () => {
  return (
    <div className='mt-auto mb-0'>
      <Marker className='px-4 mb-2 text-primary' variant='separator'>
        <MarkerContent>Setup guide</MarkerContent>
      </Marker>
      <Accordion className='border-none rounded-none text-muted-foreground mb-8' defaultValue={[]}>
        {setupGuide.map((itm, idx) => (
          <AccordionItem key={idx} className='border-none px-4' value={`item-${idx + 1}`}>
            <AccordionTrigger className='px-0 py-2 no-underline!'>{itm.title}</AccordionTrigger>
            <AccordionContent className='text-xs'>{itm.description}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Marker className='px-4 mb-2 text-primary' variant='separator'>
        <MarkerContent>Troubleshooting</MarkerContent>
      </Marker>
      <Accordion className='border-none rounded-none text-muted-foreground mb-4' defaultValue={[]}>
        {troubleshootingGuide.map((itm, idx) => (
          <AccordionItem key={idx} className='border-none px-4' value={`item-${idx + 1}`}>
            <AccordionTrigger className='px-0 py-2 no-underline!'>{itm.title}</AccordionTrigger>
            <AccordionContent className='text-xs'>{itm.description}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

const Footer = () => {
  const { theme, themes, setTheme } = useTheme();

  const handleTheme = () =>
    setTheme((theme) => {
      const index = themes.findIndex((el) => el === theme);
      const themesLength = themes.length;
      const newThemeIndex = (index + 1) % themesLength;
      return themes[newThemeIndex];
    });

  return (
    <SidebarFooter className='flex-row items-center gap-2 px-4'>
      <hr className='border-muted flex-1' />
      <Button variant='outline' size='icon' onClick={handleTheme}>
        <SunIcon
          className={cn('h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0', {
            'opacity-0': theme === 'system',
          })}
        />
        <MoonIcon
          className={cn(
            'absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100',
            {
              'opacity-0': theme === 'system',
            },
          )}
        />
        <MonitorIcon
          className={cn('absolute h-[1.2rem] w-[1.2rem] transition-all opacity-0', {
            'opacity-100': theme === 'system',
          })}
        />
        <span className='sr-only'>Toggle theme</span>
      </Button>
    </SidebarFooter>
  );
};

export function AppSidebar() {
  return (
    <Sidebar>
      <Header />
      <SidebarContent>
        <Instructions />
        {/* <SidebarGroup />
        <SidebarGroup /> */}
      </SidebarContent>
      <Footer />
    </Sidebar>
  );
}
