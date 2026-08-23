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
import { toast } from '@/components/ui/toast';

const Header = () => {
  const { ipAddress, portNumber, ipChanged } = useIpAddress();

  return (
    <SidebarHeader>
      <div className='group/sidebar-header flex items-center gap-2 px-2 py-4'>
        <LogoIconSvg className='w-12 h-fit' />
        <div className='text-left'>
          <div className='font-black cursor-default select-none [text-box:trim-both]'>Pinnacle</div>
          <div className='relative grid grid-cols-[0fr_auto] group-hover/sidebar-header:grid-cols-[1fr_auto] text-xs transition-all duration-300 ease-out delay-1000 group-hover/sidebar-header:delay-0'>
            <span className='overflow-hidden text-muted-foreground'>http://</span>
            <span className='text-muted-foreground'>
              {ipAddress}:{portNumber}
            </span>
            <span
              className={cn(
                'block left-full absolute inset-y-0 bg-amber-700 my-auto ml-2 px-2 rounded-full h-fit text-amber-200 transition-opacity duration-300 pointer-events-none',
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
    title: <span>Set Network to Private (Windows)</span>,
    description: (
      <span>
        Go to your Windows network settings and confirm your connection type is set to <strong>Private</strong> (Public
        mode blocks local sharing).
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
  const { ipAddress, portNumber } = useIpAddress();
  // Setup Guide
  const setupGuide = [
    {
      title: <span>Use private Wi-Fi</span>,
      description: (
        <span>
          Use a private Wi-Fi or a mobile hotspot. Avoid public Wi-Fi in random places, which prevents devices from
          connecting.
        </span>
      ),
    },
    {
      title: <span>Launch & “Allow”</span>,
      description: (
        <span>
          Open the application. If a security or firewall window pops up asking for network permissions, click{' '}
          <strong>Allow</strong> or <strong>Grant Access</strong>.
        </span>
      ),
    },
    {
      title: <span>Share the Address</span>,
      description: (
        <span>
          Type or send this exact{' '}
          <button
            onClick={() => {
              void navigator.clipboard.writeText(`http://${ipAddress}:${portNumber}`).then(() => {
                toast.add({ title: 'Copied to clipboard' });
              });
            }}
            type='button'>
            <strong>
              <code>
                http://{ipAddress}:{portNumber}
              </code>
            </strong>
          </button>{' '}
          address into the web browser on the other device.
        </span>
      ),
    },
  ];

  return (
    <div className='mt-auto mb-0'>
      <Marker className='mb-2 px-4 text-primary' variant='separator'>
        <MarkerContent>Setup guide</MarkerContent>
      </Marker>
      <Accordion className='mb-8 border-none rounded-none text-muted-foreground' defaultValue={['item-3']}>
        {setupGuide.map((itm, idx) => (
          <AccordionItem key={idx} className='px-4 border-none' value={`item-${idx + 1}`}>
            <AccordionTrigger className='px-0 py-2 no-underline!'>{itm.title}</AccordionTrigger>
            <AccordionContent className='text-xs'>{itm.description}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Marker className='mb-2 px-4 text-primary' variant='separator'>
        <MarkerContent>Troubleshooting</MarkerContent>
      </Marker>
      <Accordion className='mb-4 border-none rounded-none text-muted-foreground' defaultValue={[]}>
        {troubleshootingGuide.map((itm, idx) => (
          <AccordionItem key={idx} className='px-4 border-none' value={`item-${idx + 1}`}>
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
      <hr className='flex-1 border-muted' />
      <Button variant='outline' size='icon' onClick={handleTheme}>
        <SunIcon
          className={cn('w-[1.2rem] h-[1.2rem] rotate-0 dark:-rotate-90 scale-100 dark:scale-0 transition-all', {
            'opacity-0': theme === 'system',
          })}
        />
        <MoonIcon
          className={cn(
            'absolute w-[1.2rem] h-[1.2rem] rotate-90 dark:rotate-0 scale-0 dark:scale-100 transition-all',
            {
              'opacity-0': theme === 'system',
            },
          )}
        />
        <MonitorIcon
          className={cn('absolute opacity-0 w-[1.2rem] h-[1.2rem] transition-all', {
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
