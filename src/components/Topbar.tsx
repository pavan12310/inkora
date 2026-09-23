import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { unreadCount } from "@/lib/notify";
import Icon, { NibMark } from "@/components/Icon";
import AccountMenu from "@/components/AccountMenu";

export default async function Topbar({ query = "" }: { query?: string }) {
  const [settings, user] = await Promise.all([getSettings(), currentUser()]);
  const unread = user ? await unreadCount(user.id) : 0;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="wordmark">
          <NibMark />
          <span>
            {settings.name}
            <span className="dot">.</span>
          </span>
        </Link>

        <form className="searchbox" action="/search">
          <Icon name="search" size={18} />
          <input type="search" name="q" defaultValue={query} placeholder="Search" aria-label="Search" />
        </form>

        <div className="topbar-right">
          <Link href="/write" className="top-action">
            <Icon name="pen" size={20} />
            <span className="label">Write</span>
          </Link>
          {user && (
            <Link href="/notifications" className="top-action bell" aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
            }>
              <Icon name="bell" size={20} />
              {unread > 0 && <span className="dot-count">{unread > 9 ? "9+" : unread}</span>}
            </Link>
          )}
          {user ? (
            <AccountMenu
              user={{
                name: user.name,
                handle: user.handle,
                email: user.email,
                image: user.image,
                isAdmin: user.isAdmin,
              }}
            />
          ) : (
            <Link href="/signin" className="btn primary">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
