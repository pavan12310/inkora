"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/auth-actions";
import Icon, { Avatar } from "@/components/Icon";

type Viewer = {
  name: string | null;
  handle: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
};

/**
 * The avatar in the top bar opens the account menu.
 *
 * It used to be a bare link to the public profile, which meant sign out lived
 * only in the left rail and there was no single place that answered "what is
 * my account". Everything about the person now hangs off one control.
 */
export default function AccountMenu({ user }: { user: Viewer }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        // Send focus back to the trigger, or a keyboard user is stranded at the
        // top of the document with no idea where they are.
        button.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const shown = user.name || `@${user.handle}`;

  return (
    <div className="acct" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="acct-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <Avatar name={user.name} handle={user.handle} image={user.image} size="md" />
      </button>

      {open && (
        <div className="acct-menu" role="menu">
          <Link
            href={`/author/${user.handle}`}
            className="acct-who"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Avatar name={user.name} handle={user.handle} image={user.image} size="md" />
            <span>
              <strong>{shown}</strong>
              <em>View profile</em>
            </span>
          </Link>

          <div className="acct-rule" />

          <Link href="/write" className="acct-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="pen" size={17} />
            Write
          </Link>
          <Link href="/me" className="acct-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="stack" size={17} />
            Your pieces
          </Link>
          <Link href="/notifications" className="acct-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="bell" size={17} />
            Notifications
          </Link>
          <Link href="/stats" className="acct-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="chart" size={17} />
            Stats
          </Link>
          <Link
            href="/me?tab=saved"
            className="acct-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="bookmark" size={17} />
            Saved
          </Link>

          {user.isAdmin && (
            <Link href="/desk" className="acct-item" role="menuitem" onClick={() => setOpen(false)}>
              <Icon name="inbox" size={17} />
              Editor&rsquo;s desk
            </Link>
          )}

          <div className="acct-rule" />

          <Link
            href="/me?tab=profile"
            className="acct-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="settings" size={17} />
            Settings
          </Link>
          <Link href="/about" className="acct-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="info" size={17} />
            What gets published
          </Link>

          <div className="acct-rule" />

          <form action={signOutAction}>
            <button type="submit" className="acct-item out" role="menuitem">
              Sign out
            </button>
          </form>
          <p className="acct-email">{user.email}</p>
        </div>
      )}
    </div>
  );
}
