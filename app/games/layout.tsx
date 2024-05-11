import layout from '@/app/dashboard/layout';
import SideNav from '../ui/dashboard/sidenav';

export default function gameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="w-full flex-none md:w-64">
        <SideNav />
      </div>
      <div>{children}</div>
    </div>
  );
}
