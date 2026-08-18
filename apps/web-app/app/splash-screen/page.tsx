'use client';

import { LogoWideSvg } from '@/app/splash-screen/LogoWide.svg';
import classNames from 'classnames';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [hideLogo, setHideLogo] = useState(false);
  const router = useRouter();

  const goToControlPage = () => router.push('/controls');

  useEffect(() => {
    setTimeout(() => {
      setHideLogo(true);
    }, 850); // 850ms + 150ms transition duration => 1000ms => 1s in total
  }, []);

  return (
    <div className='grid place-items-center flex-1'>
      <LogoWideSvg
        className={classNames('h-10 w-auto text-zinc-600 dark:text-zinc-300 transition-opacity ease-in', {
          'opacity-0': hideLogo,
        })}
        onTransitionEnd={goToControlPage}
      />
    </div>
  );
}
