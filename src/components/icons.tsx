import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 0C8.95431 0 0 8.95431 0 20C0 31.0457 8.95431 40 20 40C31.0457 40 40 31.0457 40 20C40 8.95431 31.0457 0 20 0Z" fill="hsl(var(--primary))"/>
      <path d="M12.2383 29.8418V10.1582H16.2266V15.543H23.7734V10.1582H27.7617V29.8418H23.7734V24.457H16.2266V29.8418H12.2383ZM16.2266 20.4688H23.7734V18.1719H16.2266V20.4688Z" fill="hsl(var(--primary-foreground))"/>
    </svg>
  );
}
