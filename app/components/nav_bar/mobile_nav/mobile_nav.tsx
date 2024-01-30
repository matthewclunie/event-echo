'use client';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import NavLinks from '../nav_links/nav_links';
import { useState } from 'react';

const MobileNav = () => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-96">
        <SheetClose asChild>
          <NavLinks navStyle="mobile" setSheetOpen={setSheetOpen} />
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
